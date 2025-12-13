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
      inputQty: "",
      dropdownOpen: false,
    });
  }

  get selectedProduct() {
    if (!this.state.selectedProductId) return null;
    return this.props.products.find(
      (p) => p.id === parseInt(this.state.selectedProductId)
    );
  }

  get availableProducts() {
    const addedIds = this.state.lines.map((l) => l.product_id);
    return this.props.products.filter((p) => !addedIds.includes(p.id));
  }

  getImageUrl(productId) {
    return `/web/image?model=product.product&field=image_128&id=${productId}`;
  }

  toggleDropdown() {
    this.state.dropdownOpen = !this.state.dropdownOpen;
  }

  selectProduct(productId) {
    this.state.selectedProductId = productId;
    this.state.dropdownOpen = false;
  }

  onKeypadClick(value) {
    if (value === "C") {
      this.state.inputQty = "";
    } else if (value === ".") {
      if (!this.state.inputQty.includes(".")) {
        this.state.inputQty += value;
      }
    } else {
      // If input is 0, replace it, otherwise append
      if (this.state.inputQty === "0") {
        this.state.inputQty = value;
      } else {
        this.state.inputQty += value;
      }
    }
  }

  addLine() {
    const productId = parseInt(this.state.selectedProductId);
    const qty = parseFloat(this.state.inputQty);

    if (!productId || isNaN(qty)) {
      return;
    }

    const product = this.props.products.find((p) => p.id === productId);
    if (!product) return;

    // Check if product is already added
    if (this.state.lines.some((l) => l.product_id === productId)) {
      return;
    }

    this.state.lines.push({
      id: Date.now(),
      product_id: productId,
      product_name: product.display_name,
      quantity: qty,
    });

    this.state.selectedProductId = "";
    this.state.inputQty = "";
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
