var jFrame = require('../lib/jsonFrame'),
jsonFrame = jFrame({lengthPrefix: 2}),
rpcServer = jsonFrame.server({host: 'localhost', port: 3000});


