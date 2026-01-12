# -*- coding: utf-8 -*-
from odoo import fields, models

class PosConfig(models.Model):
    _inherit = 'pos.config'

    hide_closing_register = fields.Boolean(string="Hide Closing Register", default=True)
    enable_inventory_adjustment = fields.Boolean(string="Enable Inventory Adjustment", default=True)
    inventory_adjustment_product_ids = fields.Many2many('product.product', string="Inventory Adjustment Products")
    print_method = fields.Selection([
        ('chrome_preview', 'Chrome Print Preview'),
        ('qz_tray', 'QZ Tray'),
    ], string="Print Method", default='chrome_preview', help="Select the printing method: Chrome Print Preview (browser dialog) or QZ Tray (direct printing)")
