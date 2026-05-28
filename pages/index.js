import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqiuynpweumrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

// ====== 新增：上传文件函数 ======
const uploadFile = async (file, folder = "media") => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file);

  if (error) {
    console.log(error);
    return null;
  }

  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// ====== 原组件 ======
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginErr, setLoginErr] = useState("");

  const [newPost, setNewPost] = useState("");

  // ====== 新增：媒体 ======
  const [mediaFile, setMediaFile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("raner_user");
    if (saved) {
      setUser(JSON.parse(saved));
      setPage("feed");
    }
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  // ====== 登录（修复版） ======
  const login = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", loginForm.username.trim())
      .eq("password", loginForm.password.trim())
      .single();

    if (error || !data) {
      setLoginErr("用户名或密码错误");
      return;
    }

    setUser(data);
    localStorage.setItem("raner_user", JSON.stringify(data));
    setPage("feed");
  };

  // ====== 发布（核心升级） ======
  const publishPost = async () => {
    if (!newPost && !mediaFile) return;

    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      mediaUrl = await uploadFile(mediaFile);

      if (mediaFile.type.startsWith("image")) mediaType = "image";
      if (mediaFile.type.startsWith("video")) mediaType = "video";
    }

    await supabase.from("posts").insert({
      content: newPost,
      author_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
    });

    setNewPost("");
    setMediaFile(null);
    loadPosts();
  };

  // ====== UI ======
  return (
    <div style={{ padding: 20 }}>
      {page === "login" && (
        <div>
          <h2>登录</h2>

          <input
            placeholder="用户名"
            value={loginForm.username}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
          />

          <input
            placeholder="密码"
            type="password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          <button onClick={login}>登录</button>

          <div style={{ color: "red" }}>{loginErr}</div>
        </div>
      )}

      {page === "feed" && (
        <div>
          <h2>动态</h2>

          {/* ===== 发帖区（新增上传） ===== */}
          <div style={{ marginBottom: 20 }}>
            <textarea
              placeholder="说点什么..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />

            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files[0])}
            />

            <button onClick={publishPost}>发布</button>
          </div>

          {/* ===== 帖子渲染（新增媒体展示） ===== */}
          {posts.map((p) => (
            <div key={p.id} style={{ border: "1px solid #ddd", margin: 10 }}>
              <p>{p.content}</p>

              {/* 图片 */}
              {p.media_type === "image" && (
                <img
                  src={p.media_url}
                  style={{ width: "100%", maxWidth: 400 }}
                />
              )}

              {/* 视频 */}
              {p.media_type === "video" && (
                <video
                  src={p.media_url}
                  controls
                  style={{ width: "100%", maxWidth: 400 }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
