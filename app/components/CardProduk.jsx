import Image from "next/image";
import { IoHeart } from "react-icons/io5";

export default function CardProduk({
  nama,
  harga,
  gambar,
  terjual,
  edit,
  onEdit,
  stok,
  isLoved,
  onLove,
  onClick,
  onHapus,
  loveProduk = false,
  showLove = false,
}) {
  function capitalizeFirst(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const isHabis = stok <= 0;
  return (
    <>
      <div
        onClick={isHabis ? null : onClick}
        className={`cursor-pointer flex-1 min-w-52 max-w-[200px]  m-2 border border-gray-400 shadow-lg rounded-lg flex flex-col p-2 dark:border-slate-600 dark:bg-slate-700 transition-all duration-300 dark:hover:bg-slate-750  ${isHabis ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {" "}
        <div className="relative w-full">
          <Image
            src={gambar || "/no-image.png"}
            width={100}
            height={100}
            alt="foto barang"
            className="object-cover w-full h-35 rounded-md text-center dark:bg-slate-700"
          ></Image>
          <div className="absolute top-0 right-0  rounded-full">
            <IoHeart
              onClick={(e) => {
                e.stopPropagation(); // Biar tidak kena klik card
                onLove();
              }}
              size={20}
              className={` ${isLoved ? "text-red-500" : "text-white"} ${
                loveProduk ? "hidden" : ""
              } ${showLove ? "hidden" : ""} cursor-pointer m-2 drop-shadow-lg transition-transform active:scale-125`}
            />
          </div>
        </div>
        <h1 className="font-semibold text-gray-800 dark:text-slate-100 line-clamp-2 min-h-10">
          {capitalizeFirst(nama)}
        </h1>
        <p>★★★★★</p>
        <p className="font-light text-xs dark:text-slate-400 uppercase tracking-tight">
          Terjual: {terjual}
        </p>
        <p className="font-light text-sm dark:text-blue-400">{harga}</p>
        <div className="flex justify-between w-full gap-1">
          {" "}
          <button
            onClick={onEdit}
            className={`${
              edit === false ? "hidden" : ""
            } text-center border-gray-100 bg-blue-500 rounded-lg p-2 mt-2 cursor-pointer w-1/2 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors `}
          >
            Edit
          </button>
          <button
            onClick={onHapus}
            className={`${
              edit === false ? "hidden" : ""
            } text-center border-gray-100 bg-blue-500 rounded-lg p-2 mt-2 cursor-pointer w-1/2 dark:bg-red-600 dark:hover:bg-red-500 transition-colors`}
          >
            Hapus
          </button>
        </div>
      </div>
    </>
  );
}
