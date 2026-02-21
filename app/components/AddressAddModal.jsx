import { useState } from "react";
export default function AddAdressModal({ currentUser, onClose, onAddAddress }) {
  const [address, setAddress] = useState({
    userId: currentUser?.user?.id,
    status: false,
    nama: "",
    alamat: "",
    telepon: 0,
    lokasi: "",
    status: false,
  });

  const handleAlamat = (e) => {
    e.preventDefault();

    onAddAddress(address);
    onClose();
  };

  return (
    <>
      <div className="w-full">
        <form
          onSubmit={handleAlamat}
          className="flex flex-wrap flex-start space-x-28"
        >
          <label htmlFor="nama" className="flex flex-col w-1/3">
            Nama
            <input
              type="text"
              id="nama"
              placeholder="Contoh: Rumah"
              value={address.nama}
              onChange={(e) => setAddress({ ...address, nama: e.target.value })}
              className="p-2 border border-black rounded-md focus:outline-none   hover:border-blue-400"
            />
          </label>
          <label htmlFor="alamat" className="flex flex-col w-1/3">
            Alamat
            <input
              type="text"
              id="alamat"
              value={address.alamat}
              onChange={(e) =>
                setAddress({ ...address, alamat: e.target.value })
              }
              placeholder="Contoh: jalan dewisartika"
              className="p-2 border border-black rounded-md focus:outline-none   hover:border-blue-400"
            />
          </label>
          <label htmlFor="telepon" className="flex flex-col w-1/3">
            Telepon
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={address.telepon}
              onChange={(e) => {
                const onlyNumber = e.target.value.replace(/\D/g, "");
                setAddress({ ...address, telepon: onlyNumber });
              }}
              placeholder="Contoh: 0822xxx"
              className="p-2 border border-black rounded-md focus:outline-none   hover:border-blue-400"
            />
          </label>
          <label htmlFor="lokasi" className="flex flex-col w-1/3">
            Lokasi
            <input
              type="text"
              id="lokasi"
              value={address.lokasi}
              onChange={(e) =>
                setAddress({ ...address, lokasi: e.target.value })
              }
              placeholder="Palu, sulawesi tengah"
              className="p-2 border border-black rounded-md focus:outline-none   hover:border-blue-400"
            />
          </label>
          <button
            type="submit"
            className="border-2 mt-5 rounded-md p-2 border-blue-500 text-black hover:text-white hover:bg-blue-500"
          >
            Tambahkan
          </button>
        </form>
      </div>
    </>
  );
}
