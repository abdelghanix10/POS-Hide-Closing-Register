/** @odoo-module */

console.log("pos_hide_closing_register module loaded");

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

patch(PosStore.prototype, {
  async closeSession() {
    console.log("Custom closeSession called");
    // Custom logic for closing register without popup

    // 1. Get expected cash from server
    const info = await this.getClosePosInfo();
    let expectedCash = 0;
    if (info && info.default_cash_details) {
      expectedCash = info.default_cash_details.amount;
    }

    // 2. Print "Daily Sale"
    // Assuming we print the session summary
    const receipt = this._getDailySaleReceipt();
    if (this.hardwareProxy.printer) {
      this.hardwareProxy.printer.print_receipt(receipt);
    }

    // 3. Close register
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
    if (response.successful) {
      localStorage.removeItem(`pos.session.${odoo.pos_config_id}`);
      sessionStorage.removeItem(`connected_cashier_${odoo.pos_config_id}`);
      window.location = `/pos/ui?config_id=${odoo.pos_config_id}`;
    }
  },

  _getDailySaleReceipt() {
    // Generate a simple receipt for daily sale
    let receipt = "Daily Sale Report\n";
    receipt += "Session: " + this.session.name + "\n";
    receipt += "Date: " + new Date().toLocaleDateString() + "\n";
    receipt += "Total Sales: " + this.session.total_payments_amount + "\n";
    // Add more details as needed
    receipt += "\nThank you!\n";
    return receipt;
  },
});
