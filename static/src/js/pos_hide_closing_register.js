/** @odoo-module */

console.log("pos_hide_closing_register module loaded");

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { InventoryAdjustmentPopup } from "./inventory_adjustment_popup";
import { makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";

patch(PosStore.prototype, {
  async closeSession() {
    console.log("Custom closeSession called");

    // 0. Ask for Inventory Adjustment
    let products = [];
    if (this.models && this.models["product.product"]) {
      products = this.models["product.product"].getAll();
    } else if (this.db) {
      products = Object.values(this.db.product_by_id);
    }

    const payload = await makeAwaitable(
      this.env.services.dialog,
      InventoryAdjustmentPopup,
      {
        title: "Inventory Check",
        products: products,
      }
    );

    if (!payload) {
      return;
    }

    if (payload && payload.length > 0) {
      await this.data.call("pos.session", "apply_inventory_adjustments", [
        this.session.id,
        payload,
      ]);
    }

    // Custom logic for closing register without popup

    // 1. Get expected cash from server
    const info = await this.getClosePosInfo();
    let expectedCash = 0;
    if (info && info.default_cash_details) {
      expectedCash = info.default_cash_details.amount;
    }

    // 2. Close register
    if (this.config.cash_control) {
      await this.data.call(
        "pos.session",
        "post_closing_cash_details",
        [this.session.id],
        {
          counted_cash: expectedCash,
        }
      );
    }
    await this.data.call(
      "pos.session",
      "update_closing_control_state_session",
      [this.session.id, ""]
    );
    const response = await this.data.call(
      "pos.session",
      "close_session_from_ui",
      [this.session.id, []],
      {
        context: {
          login_number: odoo.login_number,
        },
      }
    );

    // 3. Print "Daily Sale" (Sale Details Report)
    try {
      const reportHtml = await this.data.call(
        "pos.session",
        "get_daily_sale_report_html",
        [this.session.id]
      );

      // Create a temporary element to hold the report HTML
      const reportElement = document.createElement("div");
      reportElement.classList.add("pos-daily-sale-report");
      reportElement.innerHTML = reportHtml;

      // Print using the printer service
      await this.env.services.printer.printHtml(reportElement, {
        webPrintFallback: true,
      });
    } catch (error) {
      console.error("Failed to print Daily Sale report:", error);
    }

    if (response.successful) {
      localStorage.removeItem(`pos.session.${odoo.pos_config_id}`);
      sessionStorage.removeItem(`connected_cashier_${odoo.pos_config_id}`);
      window.location = `/pos/ui?config_id=${odoo.pos_config_id}`;
    }
  },
});
