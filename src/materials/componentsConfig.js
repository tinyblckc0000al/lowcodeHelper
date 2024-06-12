const componentsConfigMap = {
    'el-input': {
        'label': 'el-input',
        'data': {
            'attrs': {
                'class': 'single-input',
                'v-model': '$inputValue'
            },
            'events': {
            }
        },
        'couldHaveChild': false,
        'children': []
    },
    'div': {
        'label': 'div',
        'data': {
            'attrs':{
                'class': 'container',
            },
            'events' : {
                'click': 'console.log(this)'
            }
        },
        'couldHaveChild': true,
        'children': []
    },
    'span': {
        'label': 'span',
        'data': {
            'attrs':{
                'class': 'text',
            },
            'text': '默认span',
            'events' : {
                'click': 'console.log(this)'
            }
        },
        'couldHaveChild': true,
        'children': []
    }
}
export default componentsConfigMap
