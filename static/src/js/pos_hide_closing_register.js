/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { InventoryAdjustmentPopup } from "./inventory_adjustment_popup";
import { makeAwaitable } from "@point_of_sale/app/utils/make_awaitable_dialog";

patch(PosStore.prototype, {
  async closeSession() {
    if (!this.config.hide_closing_register) {
      return super.closeSession();
    }

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
          (item) => (item && typeof item === "object" ? item.id : item),
        );
        products = products.filter((p) => allowedIds.includes(p.id));
      }

      const payload = await makeAwaitable(
        this.env.services.dialog,
        InventoryAdjustmentPopup,
        {
          title: "Inventory Check",
          products: products,
        },
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
        },
      );
    }
    await this.data.call(
      "pos.session",
      "update_closing_control_state_session",
      [this.session.id, ""],
    );
    const response = await this.data.call(
      "pos.session",
      "close_session_from_ui",
      [this.session.id, []],
      {
        context: {
          login_number: odoo.login_number,
        },
      },
    );

    // 3. Print "Daily Sale" (Sale Details Report)
    try {
      const reportHtml = await this.data.call(
        "pos.session",
        "get_daily_sale_report_html",
        [this.session.id],
      );

      // Create a temporary element to hold the report HTML
      const reportElement = document.createElement("div");
      reportElement.classList.add("pos-daily-sale-report");
      reportElement.innerHTML = reportHtml;

      // Check print method from config
      const printMethod = this.config.print_method || "chrome_preview";

      if (printMethod === "qz_tray") {
        // Print using QZ Tray
        await this._printWithQzTray(reportHtml);
      } else {
        // Print using Chrome Print Preview (browser dialog)
        await this._printWithChromePreview(reportHtml);
      }
    } catch (error) {}

    this.isCustomClosing = false;

    if (response.successful) {
      // Delay the redirect to allow print to complete
      setTimeout(() => {
        localStorage.removeItem(`pos.session.${odoo.pos_config_id}`);
        sessionStorage.removeItem(`connected_cashier_${odoo.pos_config_id}`);
        window.location = `/pos/ui?config_id=${odoo.pos_config_id}`;
      }, 2000);
    }
  },

  async _printWithChromePreview(htmlContent) {
    // Open a new window for Chrome print preview
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Daily Sale Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
    }
  },

  async _printWithQzTray(htmlContent) {
    // Try to use the centralized QZ service first
    const qzService = this.env.services.qz_tray;

    // Wrap content with requested styles
    const wrappedHtml = `
      <html>
        <head>
          <style>
            /* Styles handled by report template */
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    if (qzService) {
      try {
        await qzService.connect();
        const qzLib = qzService.getQZ();
        const printerName = await qzLib.printers.getDefault();
        await qzService.print(printerName, wrappedHtml, "pixel", {
          scaleContent: false,
        });
        return;
      } catch (e) {
        console.error(
          "QZ Service print failed, falling back to local logic or chrome preview",
          e,
        );
      }
    }

    // Check if QZ Tray is available globally (fallback)
    if (typeof qz === "undefined") {
      await this._printWithChromePreview(htmlContent);
      return;
    }

    try {
      // Connect to QZ Tray if not connected
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      // Find the default printer
      const printer = await qz.printers.getDefault();
      if (!printer) {
        await this._printWithChromePreview(htmlContent);
        return;
      }

      // Configure print job
      const config = qz.configs.create(printer, { scaleContent: false });

      // Create print data (HTML format)
      const data = [
        {
          type: "html",
          format: "plain",
          data: wrappedHtml,
        },
      ];

      // Send to printer
      await qz.print(config, data);
    } catch (error) {
      // Fallback to Chrome print preview
      await this._printWithChromePreview(htmlContent);
    }
  },

  closingSessionNotification(data) {
    if (this.isCustomClosing) return;
    if (data.message === "close_tabs" && data.session == this.session.id) {
      this.closePos();
    }
  },
});
