const supabase = require("../config/supabaseClient");
const { generateToken } = require("../lib/services/jwtService");

const createUser = async (user) => {
  const { data, error } = await supabase
    .from("users")
    .insert({ 
      name: user.name, 
      email: user.email, 
      password: user.password 
    })
    .select()
    .single();

  return { data, error };
};

const updateUser = async(user) => {
  const { data, error } = await supabase
    .from("users")
    .update({ 
      name: user.name, 
      email: user.email, 
      password: user.password 
    })
    .eq("user_id", user.user_id)
    .select()
    .single();
    
    return { data, error };
};

const userController = {
  // --------------------- USERS ---------------------
  addUser: async (request, h) => {
    const user = request.payload;

    const { data, error } = await createUser(user);

    if (error) {
      return h.response({ status: "fail", message: error.message }).code(400);
    }

    return h.response({ 
      status: "success", 
      user: { user_id: data.user_id, name: data.name, email: data.email } 
    }).code(201);
  },

  updateUser: async (request, h) => {
    const { user_id } = request.params;
    const { name, email, password } = request.payload;
    const user = { user_id, name, email, password };

    const { data, error } = await updateUser(user);

    if (error || !data) {
      return h
        .response({
          status: "fail",
          message: error?.message || "User not found",
        })
        .code(404);
    }

    return h.response({ status: "success", user_id: data.user_id }).code(200);
  },

  login: async (request, h) => {
    const { name, password } = request.payload;
    const key = name.includes("@") ? "email" : "name";

    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, name, email")
      .eq(key, name)
      .eq("password", password)
      .maybeSingle();

    if (error || !user) {
      return h
        .response({ status: "fail", message: "Invalid credentials" })
        .code(401);
    }

    const { data: owner } = await supabase
      .from("owners")
      .select("*")
      .eq("owner_id", user.user_id)
      .maybeSingle();

    const role = owner ? "owner" : "worker";

    const token = generateToken({
      user_id: user.user_id,
      name: user.name,
      role,
    });

    return h.response({ status: "success", token, user }).code(200);
  },

  getUserInfo: async (request, h) => {
    const { user_id } = request.params;

    const { data, error } = await supabase
      .from("users")
      .select("user_id, name, email, password")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error || !data) {
      return h
        .response({ status: "fail", message: "User not found" })
        .code(404);
    }

    return h.response({ status: "success", data }).code(200);
  },

  deleteUser: async (request, h) => {
    const { user_id } = request.params;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", user_id);

    if (error) {
      return h.response({ status: "fail", message: error.message }).code(400);
    }

    return h.response({ status: "success", message: "User deleted" }).code(200);
  },

  // --------------------- OWNERS ---------------------
  getOwnerAll: async (request, h) => {
    const { data, error } = await supabase
      .from('owners_with_user_info')
      .select('owner_id, name, email, password');

    if (error) {
      return h.response({ status: "fail", message: error.message }).code(400);
    }

    return h.response({ status: "success", data }).code(200);
  },

  addOwner: async (request, h) => {
    const user = request.payload;

    const { data, error: errorUser } = await createUser(user);

    if (errorUser) {
      return h
        .response({
          status: "fail",
          message: `Gagal menambahkan user: ${errorUser.message}`,
        })
        .code(400);
    }

    const { data: owner, error: errorOwner } = await supabase
      .from("owners")
      .insert({ owner_id: data.user_id })
      .select()
      .single();

    if (errorOwner) {
      return h
        .response({
          status: "fail",
          message: `Gagal menambahkan worker: ${errorOwner.message}`,
        })
        .code(400);
    }

    return h
      .response({
        status: "success",
        message: "Owner berhasil ditambahkan",
        data: { user: { user_id: data.user_id, name: data.name, email: data.email }, owner },
      })
      .code(201);
  },

  deleteOwner: async (request, h) => {
    const { owner_id } = request.params;

    const { error: errorOwner } = await supabase
      .from("owners")
      .delete()
      .eq("owner_id", owner_id);

    if (errorOwner) {
      return h
        .response({
          status: "fail",
          message: `Gagal menghapus data owner: ${errorOwner.message}`,
        })
        .code(400);
    }

    const { error: errorUser } = await supabase
      .from("users")
      .delete()
      .eq("user_id", owner_id);

    if (errorUser) {
      return h
        .response({
          status: "fail",
          message: `Gagal menghapus data user: ${errorUser.message}`,
        })
        .code(400);
    }

    return h
      .response({
        status: "success",
        message: "Owner dan user berhasil dihapus",
      })
      .code(200);
  },

  // --------------------- WORKERS ---------------------
  addWorker: async (request, h) => {
    const user = request.payload;

    const { data, error: errorUser } = await createUser(user);

    if (errorUser) {
      return h
        .response({
          status: "fail",
          message: `Gagal menambahkan user: ${errorUser.message}`,
        })
        .code(400);
    }

    const { data: worker, error: errorWorker } = await supabase
      .from("workers")
      .insert({ worker_id: data.user_id, role_id: user.role_id })
      .select()
      .single();

    if (errorWorker) {
      return h
        .response({
          status: "fail",
          message: `Gagal menambahkan worker: ${errorWorker.message}`,
        })
        .code(400);
    }

    return h
      .response({
        status: "success",
        message: "Worker berhasil ditambahkan",
        data: { user: { user_id: data.user_id, name: data.name, email: data.email }, worker },
      })
      .code(201);
  },

  updateWorker: async (request, h) => {
    const { worker_id } = request.params;
    const { name, email, password, role_id } = request.payload;
    const userA = { user_id: worker_id, name, email, password };

    const { data: user, error: errorUser } = await updateUser(userA);

    if (errorUser || !user) {
      return h
        .response({
          status: "fail",
          message: `Gagal update user: ${
            errorUser?.message || "User not found"
          }`,
        })
        .code(404);
    }

    const { data: worker, error: errorWorker } = await supabase
      .from("workers")
      .update({ role_id })
      .eq("worker_id", worker_id)
      .select()
      .single();

    if (errorWorker || !worker) {
      return h
        .response({
          status: "fail",
          message: `Gagal update worker: ${
            errorWorker?.message || "Worker not found"
          }`,
        })
        .code(404);
    }

    return h
      .response({
        status: "success",
        message: "Data worker berhasil diperbarui",
        data: { user: { user_id: user.user_id, name: user.name, email: user.email }, worker },
      })
      .code(200);
  },

  deleteWorker: async (request, h) => {
    const { worker_id } = request.params;

    const { error: errorWorker } = await supabase
      .from("workers")
      .delete()
      .eq("worker_id", worker_id);

    if (errorWorker) {
      return h
        .response({
          status: "fail",
          message: `Gagal menghapus data worker: ${errorWorker.message}`,
        })
        .code(400);
    }

    const { error: errorUser } = await supabase
      .from("users")
      .delete()
      .eq("user_id", worker_id);

    if (errorUser) {
      return h
        .response({
          status: "fail",
          message: `Gagal menghapus data user: ${errorUser.message}`,
        })
        .code(400);
    }

    return h
      .response({
        status: "success",
        message: "Worker dan user berhasil dihapus",
      })
      .code(200);
  },

  assignRole: async (request, h) => {
    const { worker_id } = request.params;
    const { role_id } = request.payload;

    const { data, error } = await supabase
      .from("workers")
      .update({ role_id })
      .eq("worker_id", worker_id)
      .select()
      .single();

    if (error || !data) {
      return h
        .response({
          status: "fail",
          message: error?.message || "Worker not found",
        })
        .code(404);
    }

    return h.response({ status: "success", data }).code(200);
  },

  getWorkers: async (request, h) => {
    const { data, error } = await supabase
      .from("workers_with_user_info")
      .select("worker_id, name, roleworker, email, password");

    if (error) {
      return h.response({ status: "fail", message: error.message }).code(400);
    }

    return h.response({ status: "success", data }).code(200);
  },

  getWorkerInfo: async (request, h) => {
    const { worker_id } = request.params;

    const { data, error } = await supabase
      .from("workers_with_user_info")
      .select("worker_id, name, roleworker, email, password")
      .eq("worker_id", worker_id)
      .maybeSingle();

    if (error || !data) {
      return h
        .response({ status: "fail", message: "Worker not found" })
        .code(404);
    }

    return h.response({ status: "success", data }).code(200);
  },

  getWorkerByRole: async (request, h) => {
    const { role_id } = request.params;

    const { data, error } = await supabase
      .from("workers_with_user_info")
      .select("worker_id, name, roleworker, email, password")
      .eq('role_id', role_id);

    if (error) {
      return h.response({ status: "fail", message: error.message }).code(400);
    }

    return h.response({ status: "success", data }).code(200);
  },
};

module.exports = userController;
