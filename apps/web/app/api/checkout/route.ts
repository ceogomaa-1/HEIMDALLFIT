import { products } from "../../../lib/mock-data";

export async function POST(request: Request) {
  const { productId } = await request.json();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  return Response.json({
    checkoutUrl: `https://checkout.stripe.com/pay/mock-${product.id}`,
    product
  });
}
