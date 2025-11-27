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
            report = self.env.ref('pos_hide_closing_register.sale_details_report')
            html = report._render_qweb_html(report.report_name, [session_id])[0].decode('utf-8')
            return html
        except Exception as e:
            import traceback
            return f"<html><body><h1>Error</h1><p>{str(e)}</p><pre>{traceback.format_exc()}</pre></body></html>"

    @api.model
    def apply_inventory_adjustments(self, session_id, adjustments):
        session = self.browse(session_id)
        if not session:
            return False
            
        StockQuant = self.env['stock.quant']
        location = session.config_id.picking_type_id.default_location_src_id
        
        for adj in adjustments:
            product_id = adj.get('product_id')
            quantity = adj.get('quantity')
            
            if product_id and quantity is not None:
                quant = StockQuant.search([
                    ('product_id', '=', product_id),
                    ('location_id', '=', location.id),
                ], limit=1)
                
                if not quant:
                    quant = StockQuant.create({
                        'product_id': product_id,
                        'location_id': location.id,
                    })
                
                quant.inventory_quantity = quantity
                quant.action_apply_inventory()
                
        return True
