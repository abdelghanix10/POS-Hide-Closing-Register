# POS Hide Closing Register

This Odoo 18 module streamlines the Point of Sale closing process by replacing the standard closing popup with a custom workflow. It integrates inventory adjustments directly into the closing sequence and automates the generation of the daily sales report.

## Features

- **Inventory Adjustment Dialog**: Before closing the session, a dialog appears allowing the cashier to input inventory counts for specific products.
  - Select products from the active session.
  - Input counted quantities.
  - Automatically creates inventory adjustments (`stock.quant`) in the backend for the session's default source location.
- **Automated Closing**: Skips the standard "Closing Control" popup.
  - Automatically retrieves expected cash details.
  - Posts closing cash details.
  - Updates closing control state.
  - Closes the session from the UI.
- **Automatic Reporting**: Automatically generates and prints the "Daily Sale" (Sale Details) report upon successful closure.
- **Session Cleanup**: Clears local storage and redirects to the POS UI start screen after closing.

## Technical Details

- **Odoo Version**: 18.0
- **Dependencies**: `point_of_sale`
- **Architecture**:
  - Extends `PosStore` to intercept the `closeSession` method.
  - Uses a custom Owl Component (`InventoryAdjustmentPopup`) for the inventory interface.
  - Inherits `pos.session` in the backend to handle report generation and inventory application.

## Usage

1.  Open a POS Session.
2.  Make sales as usual.
3.  Click the **Close Register** button.
4.  **Inventory Check**: A popup will appear.
    - Select a product and enter the quantity to adjust stock.
    - Click **Valid** to apply adjustments and proceed with closing.
    - Click **Cancel** to abort the closing process.
5.  The system will automatically close the session and print the daily report.

## Installation

1.  Clone this repository into your Odoo addons path.
2.  Update your Odoo module list.
3.  Install the **POS Hide Closing Register** module.
