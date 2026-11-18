const conf = require('ocore/conf.js');
require('./src/services/kv');
if (!conf.useExternalFullNode) {
	require('./relay.js');
}

if (!conf.useSQLiteForAssetMetadata) {
	require('./src/services/assetMetadata').initializeMetadataAndSetUpdateInterval();
}


const Handler = require('./src/handler.js');
const fastify = require('fastify')({
	logger: true
});
const cors = require('@fastify/cors');

fastify.register(cors, {
	origin: '*',
	methods: ['POST']
});
fastify.register(require('@fastify/websocket'));


fastify.register(async function (fastify) {
	fastify.post('/request', async (request) => {
		const result = await Handler(request.body);
		if (result.error) {
			return { error: result.error };
		}
		
		return result;
	});
	
	fastify.get('/ws', { websocket: true }, (connection /* SocketStream */) => {
		connection.socket.on('message', async (message) => {
			message = message.toString();
			try {
				message = JSON.parse(message);
			} catch (e) {
				return;
			}
			
			const id = message.id;
			if (!id) {
				return;
			}

			const result = await Handler(message);
			if (result.error) {
				connection.socket.send(JSON.stringify({ error: result.error, id }));
				return;
			}
			
			connection.socket.send(JSON.stringify({ result, id }));
		});
	});
	
	fastify.websocketServer.on('connection', (client) => {
		client.on('pong', () => {
			client.isAlive = true;
		});
		client.isAlive = true;
	});
	
	setInterval(() => {
		fastify.websocketServer.clients.forEach((client) => {
			if (!client.isAlive) return client.terminate();
			
			client.isAlive = false;
			client.ping();
		});
	}, 60000);
});

fastify.listen({ port: process.env.WEB_PORT }, err => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});