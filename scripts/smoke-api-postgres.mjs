const BASE_URL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function createClient() {
  let cookie = "";
  return {
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (cookie) headers.set("cookie", cookie);

      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        redirect: "manual",
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      return {
        status: response.status,
        data,
      };
    },
  };
}

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const admin = createClient();
  const customer = createClient();

  const adminLogin = await admin.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  assertOk(adminLogin.status === 200, `Admin login failed: ${adminLogin.status}`);

  const productSlug = `smoke-${Date.now()}`;
  const createProductPayload = {
    slug: productSlug,
    name: "Smoke Test Pin",
    category: "Pin",
    description: "PostgreSQL uyumluluk smoke testi urunu",
    price: 950,
    material: "pirinc",
    image: "/uploads/smoke-1.webp",
    images: ["/uploads/smoke-1.webp", "/uploads/smoke-2.webp"],
    collection: "Smoke",
    finish: "Ayna polisaj",
    stock: 10,
    leadTimeDays: 2,
    tags: "Smoke,Test",
    coatingOptions: [{ id: "gold", name: "Altin", priceDelta: 100 }],
    isNew: true,
    isLimited: false,
  };

  const createdProduct = await admin.request("/api/admin/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(createProductPayload),
  });
  assertOk(createdProduct.status === 200, `Product create failed: ${createdProduct.status}`);
  assertOk(createdProduct.data?.id, "Product id missing after create");

  const patchedProduct = await admin.request(`/api/admin/products/${productSlug}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...createProductPayload,
      name: "Smoke Test Pin Updated",
      stock: 12,
      images: ["/uploads/smoke-1.webp", "/uploads/smoke-2.webp", "/uploads/smoke-3.webp"],
    }),
  });
  assertOk(patchedProduct.status === 200, `Product patch failed: ${patchedProduct.status}`);
  assertOk((patchedProduct.data?.images || []).length === 3, "Product images not saved correctly");

  const publicProducts = await admin.request("/api/products");
  assertOk(publicProducts.status === 200, `Public products failed: ${publicProducts.status}`);
  assertOk(
    Array.isArray(publicProducts.data) && publicProducts.data.some((item) => item.slug === productSlug),
    "Created product missing from public list",
  );

  const userEmail = `smoke.${Date.now()}@example.com`;
  const signup = await customer.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Smoke User",
      email: userEmail,
      password: "Test1234",
    }),
  });
  assertOk(signup.status === 200, `User signup failed: ${signup.status}`);

  const orderCreate = await customer.request("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          productId: createdProduct.data.id,
          name: "Smoke Test Pin Updated",
          price: 950,
          quantity: 2,
        },
      ],
      shipping: {
        fullName: "Smoke User",
        email: userEmail,
        phone: "05380000012",
        address: "Test Address 1",
        city: "Istanbul",
        postalCode: "34000",
        country: "Turkiye",
      },
      customerNote: "smoke order",
      total: 0,
    }),
  });
  assertOk(orderCreate.status === 200, `Order create failed: ${orderCreate.status}`);
  assertOk(orderCreate.data?.orderId, "Order id missing");
  const orderId = orderCreate.data.orderId;

  const paymentInfo = await customer.request(`/api/orders/${orderId}/payment-info`);
  assertOk(paymentInfo.status === 200, `Payment info failed: ${paymentInfo.status}`);
  assertOk(typeof paymentInfo.data?.whatsappUrl === "string", "Payment info response missing whatsappUrl");

  const chatStarted = await customer.request(`/api/orders/${orderId}/whatsapp-start`, {
    method: "POST",
  });
  assertOk(chatStarted.status === 200, `WhatsApp start failed: ${chatStarted.status}`);

  const paymentSent = await customer.request(`/api/orders/${orderId}/payment-sent`, {
    method: "POST",
  });
  assertOk(paymentSent.status === 200, `Payment sent failed: ${paymentSent.status}`);

  const supportRequest = await customer.request("/api/support-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderId,
      productId: createdProduct.data.id,
      productName: "Smoke Test Pin Updated",
      subject: "Smoke destek talebi",
      message: "PostgreSQL uyumluluk testi icin olusturulan destek talebidir.",
    }),
  });
  assertOk(supportRequest.status === 200, `Support create failed: ${supportRequest.status}`);

  const deletedOrder = await admin.request(`/api/admin/orders/${orderId}`, {
    method: "DELETE",
  });
  assertOk(deletedOrder.status === 200, `Admin order delete failed: ${deletedOrder.status}`);

  const productAfterDeleteOrder = await admin.request(`/api/admin/products/${productSlug}`);
  assertOk(productAfterDeleteOrder.status === 200, `Product fetch failed: ${productAfterDeleteOrder.status}`);
  assertOk(productAfterDeleteOrder.data?.stock === 12, "Order delete did not restore stock");

  const deletedProduct = await admin.request(`/api/admin/products/${productSlug}`, {
    method: "DELETE",
  });
  assertOk(deletedProduct.status === 200, `Admin product delete failed: ${deletedProduct.status}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: BASE_URL,
        orderId,
        productSlug,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl: BASE_URL,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
