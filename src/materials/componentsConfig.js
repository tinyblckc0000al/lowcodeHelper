const componentsConfigMap = {
    'el-input': {
        'label': 'el-input',
        'data': {
            'attrs': {
                ':class': 'singleInput',
                'v-model': 'inputValue',
                'type': 'textarea',
                'maxlength': '500',
                'size': 'small',
                'placeholder': '请输入',
                ':autosize': '{minRows: 5, maxRows: 25}',
                'show-word-limit': true,
                'v-on:mouseleave': 'console.log(\'hi\')'
            },
            'events': {
                "@keyup": 'doSearch'
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
