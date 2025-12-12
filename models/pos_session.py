# -*- coding: utf-8 -*-
from odoo import models, api

class PosSession(models.Model):
    _inherit = 'pos.session'

    @api.model
    def get_daily_sale_report_html(self, session_id):
        try:
            session = self.env['pos.session'].browse(session_id)
            if not session:
                return "<html><body><h1>Session not found</h1></body></html>"
            # Simple test HTML
            html = f"<html><body><h1>Daily Sale Report</h1><p>Session: {session.name}</p><p>Status: {session.state}</p></body></html>"
            return html
        except Exception as e:
            import traceback
            return f"<html><body><h1>Error</h1><p>{str(e)}</p><pre>{traceback.format_exc()}</pre></body></html>"

    @api.model
    def apply_inventory_adjustments(self, session_id, adjustments):
        session = self.browse(session_id)
        if not session:
            return False
            
        location = session.config_id.picking_type_id.default_location_src_id
        
        if not adjustments:
            return True
        
        # Create inventory adjustment
        inventory = self.env['stock.inventory'].create({
            'name': f'POS Inventory Adjustment - Session {session_id}',
            'location_ids': [(6, 0, [location.id])],
            'product_ids': [(6, 0, list(set(adj['product_id'] for adj in adjustments)))],
        })
        
        inventory.action_start()
        
        for adj in adjustments:
            product_id = adj.get('product_id')
            quantity = adj.get('quantity', 0)
            
            if product_id and quantity is not None:
                product = self.env['product.product'].browse(product_id)
                if product.type != 'product':
                    continue
                
                # Create inventory line with counted quantity
                self.env['stock.inventory.line'].create({
                    'inventory_id': inventory.id,
                    'product_id': product_id,
                    'location_id': location.id,
                    'product_qty': quantity,
                })
        
        # Validate the inventory to apply adjustments
        inventory.action_validate()
        
        return True
                quant.action_apply_inventory()
                
        return True
