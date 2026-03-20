import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, variantId, ukuran, jumlah } = body;

    // cari cart user
    let cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // cek item sudah ada?
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId,
        ukuran,
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          jumlah: existingItem.jumlah + jumlah,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          ukuran,
          jumlah,
        },
      });
    }

    return NextResponse.json({ message: "Ditambahkan ke keranjang" });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { message: "UserId tidak valid" },
      { status: 400 },
    );
  }

  try {
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                sizes: true,
              },
            },
          },
        },
      },
    });

    if (!cart) return NextResponse.json({ items: [] });

    const itemsToDelete = cart.items.filter((item) => {
      const isVariantExist = !!item.variant;
      const isSizeExist = item.variant?.sizes.some(
        (s) => s.size === item.ukuran,
      );
      const isStokAda = item.variant?.stok > 0;

      return !isVariantExist || !isSizeExist || !isStokAda;
    });

    if (itemsToDelete.length > 0) {
      await prisma.cartItem.deleteMany({
        where: {
          id: { in: itemsToDelete.map((i) => i.id) },
        },
      });

      return GET(req);
    }

    for (const item of cart.items) {
      if (item.jumlah > item.variant.stok) {
        await prisma.cartItem.update({
          where: { id: item.id },
          data: { jumlah: item.variant.stok },
        });
      }
    }

    return NextResponse.json(cart);
  } catch {
    return NextResponse.json(
      { message: "Gagal sinkronisasi" },
      { status: 500 },
    );
  }
}
