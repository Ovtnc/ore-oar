import dns from "node:dns";
import type { LookupFunction } from "node:net";
import { MongoClient, type MongoClientOptions } from "mongodb";

// VPS'lerde IPv6 DNS/rotası kırıkken Node önce AAAA denerse MongoDB TLS "secureConnect" timeout verebilir.
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// systemd-resolved / VPS resolver bozuksa getaddrinfo ENOTFOUND olur. Örn: MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
// Atlas (*.mongodb.net): VPS stub resolver ENOTFOUND — 1.1.1.1 / 8.8.8.8 (MONGODB_DNS_USE_SYSTEM=1 ile kapat)
// Not: NODE_ENV'e bağlamıyoruz; PM2/next start altında production kontrolü güvenilir olmayabiliyor.
const ATLAS_DNS_FALLBACK = ["1.1.1.1", "8.8.8.8"];

function configureMongoDns(uriForAtlasCheck: string | undefined) {
  if (process.env.MONGODB_DNS_USE_SYSTEM === "1") {
    return;
  }
  const raw = process.env.MONGODB_DNS_SERVERS?.trim();
  const explicit = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (explicit.length > 0) {
    dns.setServers(explicit);
    return;
  }
  if (uriForAtlasCheck && uriForAtlasCheck.includes(".mongodb.net")) {
    dns.setServers(ATLAS_DNS_FALLBACK);
  }
}

/** Sürücü bazı ortamlarda global dns.setServers'ı atlayabiliyor; lookup her çözümlemede resolver'ı uygular. */
function createAtlasMongoLookup(): LookupFunction {
  return (hostname, options, callback) => {
    configureMongoDns(process.env.MONGODB_URI);
    const merged: dns.LookupOptions =
      process.env.MONGODB_FORCE_IPV4 === "1"
        ? { ...options, family: 4, verbatim: false }
        : { ...options, verbatim: false };
    dns.lookup(hostname, merged, callback);
  };
}

configureMongoDns(process.env.MONGODB_URI);

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }

  // Placeholder kontrolü (örn. Atlas dokümanlarındaki örnek değerler).
  const looksLikePlaceholder =
    uri.includes("cluster.example.mongodb.net") ||
    uri.includes("username:password@") ||
    uri.includes("<db_password>") ||
    (uri.includes("<") && uri.includes(">"));

  if (looksLikePlaceholder) {
    throw new Error(
      "MongoDB bağlantı bilgileri placeholder görünüyor. Lütfen MONGODB_URI'yi gerçek Atlas connection string'i ile değiştir."
    );
  }

  if (clientPromise) return clientPromise;

  // İlk bağlantıdan hemen önce tekrar uygula (.env / Atlas DNS yedeği).
  configureMongoDns(uri);

  const clientOptions: MongoClientOptions = {};
  if (process.env.MONGODB_FORCE_IPV4 === "1") {
    clientOptions.family = 4;
    clientOptions.autoSelectFamily = false;
  }
  if (uri.includes(".mongodb.net")) {
    clientOptions.lookup = createAtlasMongoLookup();
  }

  const client = new MongoClient(uri, clientOptions);

  clientPromise = globalThis.mongoClientPromise ?? client.connect();
  if (process.env.NODE_ENV !== "production") {
    globalThis.mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}
