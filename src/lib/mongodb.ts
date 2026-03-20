import { MongoClient } from "mongodb";

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

  // Bazı Atlas cluster/connection string türlerinde `serverApi` seçenekleri
  // sorun çıkarabiliyor. Şimdilik en geniş uyumluluk için bu opsiyonları kaldırıyoruz.
  const client = new MongoClient(uri);

  clientPromise = globalThis.mongoClientPromise ?? client.connect();
  if (process.env.NODE_ENV !== "production") {
    globalThis.mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}
