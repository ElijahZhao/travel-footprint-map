const cloudbase = require('@cloudbase/js-sdk')
const app = cloudbase.init({ env: 'x' })
try { console.log('auth:', Object.getOwnPropertyNames(Object.getPrototypeOf(app.auth())).filter(m=>typeof app.auth()[m]==='function')) } catch(e){ console.log('auth err', e.message) }
try { console.log('hosting:', Object.getOwnPropertyNames(Object.getPrototypeOf(app.hosting())).filter(m=>typeof app.hosting()[m]==='function')) } catch(e){ console.log('hosting err', e.message) }
