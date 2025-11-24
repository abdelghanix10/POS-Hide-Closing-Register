/** @odoo-module */

console.log("pos_hide_closing_register module loaded");

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

patch(PosStore.prototype, {
  async closeSession() {
    console.log("Custom closeSession called");
    // Custom logic for closing register without popup

    // 1. Clone payment in cash to cash count
    const cashPaymentMethod = this.models["pos.payment.method"]
      .getAll()
      .find((pm) => pm.is_cash_count);
    let expectedAmount = 0;
    if (cashPaymentMethod) {
      // Calculate expected cash as sum of cash payments
      const cashPayments = this.models["pos.payment"]
        .getAll()
        .filter(
          (p) =>
            p.payment_method_id[0] === cashPaymentMethod.id &&
            p.session_id[0] === this.session.id
        );
      expectedAmount = cashPayments.reduce((sum, p) => sum + p.amount, 0);
      // Set the real ending balance to the expected
      this.session.cash_register_balance_end_real =
        this.session.cash_register_balance_start + expectedAmount;
    }

    // 2. Print "Daily Sale"
    // Assuming we print the session summary
    const receipt = this._getDailySaleReceipt();
    if (this.hardwareProxy.printer) {
      this.hardwareProxy.printer.print_receipt(receipt);
    }

    // 3. Close register
    if (this.config.cash_control && cashPaymentMethod) {
      await this.data.call(
        "pos.session",
        "post_closing_cash_details",
        [this.session.id],
        {
          counted_cash: expectedAmount,
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
