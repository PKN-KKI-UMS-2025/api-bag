const supabase = require("../config/supabaseClient");
const { getRedis } = require('../config/redisClient');

const orderController = {
  // Buat Order
  addOrder: async (request, h) => {
    const redis = await getRedis();

    try {
      const { 
        order_name, 
        typeorder, 
        quantity, 
        note, 
        start_date, 
        due_date 
      } = request.payload;
      const { user_id } = request.auth;

      const { error } = await supabase.from("orders").insert([
        {
          owner_id : user_id,
          order_name,
          typeorder,
          quantity,
          note,
          statusorder: "Pesanan Baru",
          start_date,
          due_date,
        },
      ]);

      if (error) throw error;

      // Setelah operasi insert/update/delete berhasil
      const keys = await redis.keys('orders:*'); // ambil semua cache task
      if (keys.length) await redis.del(keys);

      return h.response({ message: "Order berhasil ditambahkan" }).code(201);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Gagal menambahkan order" }).code(500);
    }
  },

  // Ambil orders dengan pagination
  getOrders: async (request, h) => {
    const redis = await getRedis();

    try {
      const page = parseInt(request.query.page) || 1;
      const limit = 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Cek di Redis kalo tercache
      const cacheKey = `orders:page:${page}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return h.response(JSON.parse(cached)).code(200);
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_id", { ascending: false }) // urut dari yang terbaru
        .range(from, to); // ambil sesuai page

      if (error) throw error;

      const response = { page, data };
      await redis.setEx(cacheKey, 604800, JSON.stringify(response)); // selama seminggu

      return h.response(response).code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Gagal mengambil data orders" }).code(500);
    }
  },


  // Detail Order
  getOrderInfo: async (request, h) => {
    const { order_id } = request.params;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", order_id)
        .single();

      if (error) throw error;
      return h.response(data).code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Order tidak ditemukan" }).code(404);
    }
  },

  // Update Order Lengkap
  updateOrder: async (request, h) => {
    const redis = await getRedis();

    const { order_id } = request.params;
    const {
      order_name,
      typeorder,
      quantity,
      note,
      statusorder,
      start_date,
      due_date,
    } = request.payload;
    const { user_id } = request.auth;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          owner_id : user_id,
          order_name,
          typeorder,
          quantity,
          note,
          statusorder,
          start_date,
          due_date,
          updated_at: new Date(),
        })
        .eq("order_id", order_id);

      if (error) throw error;

      // Setelah operasi insert/update/delete berhasil
      const keys = await redis.keys('orders:*'); // ambil semua cache task
      if (keys.length) await redis.del(keys);

      return h.response({ message: "Order berhasil diperbarui" }).code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Gagal memperbarui order" }).code(500);
    }
  },

  // Hapus Order
  deleteOrder: async (request, h) => {
    const redis = await getRedis();

    const { order_id } = request.params;
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("order_id", order_id);
      if (error) throw error;

      // Setelah operasi insert/update/delete berhasil
      const keys = await redis.keys('orders:*'); // ambil semua cache task
      if (keys.length) await redis.del(keys);

      return h.response({ message: "Order berhasil dihapus" }).code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Gagal menghapus order" }).code(500);
    }
  },

  // Update Status Order
  updateOrderStatus: async (request, h) => {
    const redis = await getRedis();
    
    const { order_id } = request.params;
    const { statusorder } = request.payload;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ statusorder })
        .eq("order_id", order_id);

      if (error) throw error;

      // Setelah operasi insert/update/delete berhasil
      const keys = await redis.keys('orders:*'); // ambil semua cache task
      if (keys.length) await redis.del(keys);

      return h
        .response({ message: "Status order berhasil diperbarui" })
        .code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Gagal mengubah status order" }).code(500);
    }
  },

  // Ambil Semua Status Order
  getOrderStatsAll: async (_req, h) => {
    try {
      const { data, error } = await supabase
        .from("order_status")
        .select("statusorder");

      if (error) throw error;
      return h.response(data).code(200);
    } catch (err) {
      console.error(err);
      return h.response({ message: "Terjadi kesalahan server" }).code(500);
    }
  },
};

module.exports = orderController;
