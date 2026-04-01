#!/usr/bin/env node
/**
 * VPS teşhis: DNS + Mongo ping (şifreyi loglama).
 * Kullanım: cd /var/www/oar-ore && MONGODB_URI='mongodb+srv://...' node scripts/mongo-dns-check.cjs
 */
const dns = require("node:dns");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI tanımlı değil.");
  process.exit(1);
}

const shardHost = "ac-l12qhgw-shard-00-00.emovibj.mongodb.net";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder?.("ipv4first");

dns.resolve4(shardHost, (e, a) => {
  console.log("resolve4", shardHost, e ? e.message : a);
});
dns.lookup(shardHost, { family: 4, verbatim: false }, (e, addr, fam) => {
  console.log("lookup v4", shardHost, e ? e.message : `${addr} fam=${fam}`);
});

(async () => {
  try {
    const client = new MongoClient(uri, {
      family: 4,
      autoSelectFamily: false,
      lookup(hostname, opts, cb) {
        dns.resolve4(hostname, (err, addresses) => {
          if (!err && addresses?.length) {
            cb(null, addresses[0], 4);
            return;
          }
          dns.lookup(hostname, { family: 4, verbatim: false }, cb);
        });
      },
    });
    await client.connect();
    await client.db(process.env.MONGODB_DB || "oar-ore").command({ ping: 1 });
    console.log("Mongo ping: OK");
    await client.close();
  } catch (e) {
    console.error("Mongo:", e.message);
    process.exit(1);
  }
})();
