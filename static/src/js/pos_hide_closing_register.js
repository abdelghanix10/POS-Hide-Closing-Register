/** @odoo-module */

console.log("pos_hide_closing_register module loaded");

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { InventoryAdjustmentPopup } from "./inventory_adjustment_popup";
import { makeAwaitable } from "@point_of_sale/app/utils/make_awaitable_dialog";

patch(PosStore.prototype, {
  async closeSession() {
    if (!this.config.hide_closing_register) {
      return super.closeSession();
    }

    console.log("Custom closeSession called");

    this.isCustomClosing = true;

    // 0. Ask for Inventory Adjustment
    if (this.config.enable_inventory_adjustment) {
      let products = [];
      if (this.models && this.models["product.product"]) {
        products = this.models["product.product"].getAll();
      } else if (this.db) {
        products = Object.values(this.db.product_by_id);
      }

      if (
        this.config.inventory_adjustment_product_ids &&
        this.config.inventory_adjustment_product_ids.length > 0
      ) {
        const allowedIds = this.config.inventory_adjustment_product_ids.map(
          (item) => (item && typeof item === "object" ? item.id : item)
        );
        products = products.filter((p) => allowedIds.includes(p.id));
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
        this.isCustomClosing = false;
        return;
      }

      if (payload && payload.length > 0) {
        await this.data.call("pos.session", "apply_inventory_adjustments", [
          this.session.id,
          payload,
        ]);
      }
    }

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

    this.isCustomClosing = false;

    if (response.successful) {
      localStorage.removeItem(`pos.session.${odoo.pos_config_id}`);
      sessionStorage.removeItem(`connected_cashier_${odoo.pos_config_id}`);
      window.location = `/pos/ui?config_id=${odoo.pos_config_id}`;
    }
  },

  closingSessionNotification(data) {
    if (this.isCustomClosing) return;
    if (data.message === "close_tabs" && data.session == this.session.id) {
      this.closePos();
    }
  },
});
