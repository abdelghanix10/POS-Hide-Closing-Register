{
    'name': 'POS Hide Closing Register',
    'version': '1.0',
    'category': 'Point of Sale',
    'summary': 'Hide closing register popup and automate closing process',
    'description': 'This module hides the closing register popup and performs custom actions when closing the register.',
    'depends': ['point_of_sale'],
    'data': [
        'report_saledetails.xml',
        'views/pos_config_view.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_hide_closing_register/static/src/js/inventory_adjustment_popup.js',
            'pos_hide_closing_register/static/src/xml/inventory_adjustment_popup.xml',
            'pos_hide_closing_register/static/src/js/pos_hide_closing_register.js',
        ],
    },
    'installable': True,
    'application': False,
}