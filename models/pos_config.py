# -*- coding: utf-8 -*-
from odoo import fields, models

class PosConfig(models.Model):
    _inherit = 'pos.config'

    hide_closing_register = fields.Boolean(string="Hide Closing Register", default=True)
    enable_inventory_adjustment = fields.Boolean(string="Enable Inventory Adjustment", default=True)
    inventory_adjustment_product_ids = fields.Many2many('product.product', string="Inventory Adjustment Products")
