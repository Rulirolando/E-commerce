import DragDropUploader from "./DragDropUploader";
import { useState } from "react";
export default function EditProdukModal({ produk, onClose }) {
  const [harga, setHarga] = useState(produk?.harga || 0);
  const [stok, setStok] = useState(produk?.stok || 0);
  const [ukuran, setUkuran] = useState(
    produk?.sizes?.map((s) => s.size).join(", ") || "",
  );
  const [warna, setWarna] = useState(produk?.warna || "");
  const [image, setImage] = useState(null);
  const [nama, setNama] = useState(produk?.nama || "");

  const updateFotoProduk = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result); // base64
    };
    reader.readAsDataURL(file);
  };

  const saveChanges = async () => {
    try {
      const sizesArray = ukuran
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/product/edit/${produk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: produk.productId,
          nama,
          harga,
          stok,
          warna,
          sizes: sizesArray,
          image,
        }),
      });

      if (!res.ok) throw new Error("Gagal update");

      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan perubahan");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white p-2 rounded-xl shadow-2xl w-full h-fit max-w-md ">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          Edit Produk
        </h2>

        {/* Upload Foto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto Profil
          </label>
          <DragDropUploader onUpload={updateFotoProduk} />
        </div>

        {/* Form Fields */}
        <div className="space-y-1">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nama
            </label>
            <input
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Nama Produk"
              value={nama}
              type="text"
              onChange={(e) => setNama(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Harga
            </label>
            <input
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Harga"
              value={harga}
              type="text"
              onChange={(e) => setHarga(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ukuran
            </label>
            <input
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ukuran"
              value={ukuran}
              type="text"
              onChange={(e) => setUkuran(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Warna
            </label>
            <input
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Warna"
              value={warna}
              type="text"
              onChange={(e) => setWarna(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Stok
            </label>
            <input
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Stok"
              value={stok}
              type="text"
              onChange={(e) => setStok(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer
            "
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            onClick={saveChanges}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
