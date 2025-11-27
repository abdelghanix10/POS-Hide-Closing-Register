/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class InventoryAdjustmentPopup extends Component {
  static template = "pos_hide_closing_register.InventoryAdjustmentPopup";
  static components = { Dialog };
  static props = {
    close: Function,
    getPayload: Function,
    title: { type: String, optional: true },
    products: { type: Array, optional: true },
  };

  setup() {
    this.state = useState({
      lines: [],
      selectedProductId: "",
      inputQty: 0,
    });
  }

  addLine() {
    const productId = parseInt(this.state.selectedProductId);
    const qty = parseFloat(this.state.inputQty);

    if (!productId || isNaN(qty)) {
      return;
    }

    const product = this.props.products.find((p) => p.id === productId);
    if (!product) return;

    this.state.lines.push({
      id: Date.now(),
      product_id: productId,
      product_name: product.display_name,
      quantity: qty,
    });

    this.state.selectedProductId = "";
    this.state.inputQty = 0;
  }

  removeLine(id) {
    this.state.lines = this.state.lines.filter((l) => l.id !== id);
  }

  confirm() {
    this.props.getPayload(this.state.lines);
    this.props.close();
  }

  cancel() {
    this.props.close();
  }
}
