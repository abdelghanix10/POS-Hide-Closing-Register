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
