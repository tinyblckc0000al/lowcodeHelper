const vueRules = {
    attrs:['v-model',':'],
    events: ['@','v-on']
}
export function ruleRegStart(s, r = '^') {
    // console.log('s', typeof s)
    if(typeof s === 'string') {
        return new RegExp(r+s);
    }
    if (s instanceof RegExp) return new RegExp('\\b',s);
    throw new Error('无法转成正则:'+s)
}

export default vueRules