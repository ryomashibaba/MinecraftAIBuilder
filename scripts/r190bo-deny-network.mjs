/** Test/preflight guard: fail before any real socket or fetch can be opened.
 * Never imported by the separately approved real runner.
 */
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import {syncBuiltinESMExports} from 'node:module';
const deny=()=>{throw Error('R190BO_TEST_REAL_NETWORK_FORBIDDEN');};
globalThis.fetch=deny;
net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;
tls.connect=deny;http.request=deny;http.get=deny;https.request=deny;https.get=deny;
dgram.createSocket=deny;
syncBuiltinESMExports();
