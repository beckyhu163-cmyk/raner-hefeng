import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqiuynpweumrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

/* ================= UI 不动 ================= */

const avatarBg = n => {
  const c = ["#fce4ec","#e8f5e9","#e3f2fd","#fff8e1","#f3e5f5","#e0f7fa"];
  return c[(n||"?").charCodeAt(0) % c.length];
};

const Tree = () => (
  <svg width="80" height="90" viewBox="0 0 90 100" fill="none">
    <rect x="38" y="70" width="14" height="28" rx="4" fill="#c8a97e"/>
    <ellipse cx="45" cy="52" rx="28" ry="26" fill="#a8d5a2"/>
    <ellipse cx="45" cy="40" rx="22" ry="20" fill="#7ec87a"/>
    <ellipse cx="45" cy="30" rx="15" ry="14" fill="#5ab356"/>
  </svg>
);

/* ================= 主程序 ================= */

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  const [posts, setPosts] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", username: "", password: "", reason: "" });

  const [newPost, setNewPost] = useState("");

  // ⭐ 新增：媒体文件
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [loginErr, setLoginErr] = useState("");

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

  /* ================= 登录 ================= */

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

  /* ================= 注册 ================= */

  const register = async () => {
    await supabase.from("users").insert({
      name: regForm.name,
      username: regForm.username,
      password: regForm.password,
      role: "viewer",
      status: "active"
    });

    setPage("login");
  };

  /* ================= 上传文件（核心新增） ================= */

  const uploadFile = async (file, folder) => {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(`${folder}/${fileName}`, file);

    if (error) {
      console.log(error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  /* ================= 发动态（升级版） ================= */

  const publishPost = async () => {
    if (!newPost.trim() && !imageFile && !videoFile) return;

    const imageUrl = await uploadFile(imageFile, "images");
    const videoUrl = await uploadFile(videoFile, "videos");

    await supabase.from("posts").insert({
      content: newPost,
      author_id: user.id,
      image_url: imageUrl,
      video_url: videoUrl
    });

    setNewPost("");
    setImageFile(null);
    setVideoFile(null);

    loadPosts();
  };

  /* ================= UI（完全保留你原来的风格） ================= */

  if (page === "login") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f6f6f4" }}>
      <div style={{ width:340 }}>
        <div style={{ textAlign:"center" }}>
          <Tree />
          <h2>然er和风</h2>
        </div>

        <input placeholder="用户名"
          value={loginForm.username}
          onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}
        />

        <input type="password" placeholder="密码"
          value={loginForm.password}
          onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
        />

        {loginErr && <p style={{color:"red"}}>{loginErr}</p>}

        <button onClick={login}>登录</button>

        <button onClick={()=>setPage("register")}>注册</button>
      </div>
    </div>
  );

  if (page === "feed") return (
    <div style={{ padding:20, background:"#f6f6f4", minHeight:"100vh" }}>
      
      {/* 发布框（只加功能，不改风格） */}
      <div style={{ background:"#fff", padding:15, borderRadius:12, marginBottom:20 }}>
        
        <textarea
          placeholder="说点什么..."
          value={newPost}
          onChange={e=>setNewPost(e.target.value)}
          style={{ width:"100%" }}
        />

        {/* ⭐ 新增上传 */}
        <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} />
        <input type="file" accept="video/*" onChange={e=>setVideoFile(e.target.files[0])} />

        <button onClick={publishPost}>发布</button>
      </div>

      {/* 动态列表 */}
      {posts.map(p=>(
        <div key={p.id} style={{ background:"#fff", padding:15, marginBottom:10 }}>
          <p>{p.content}</p>

          {p.image_url && <img src={p.image_url} style={{ width:"100%" }} />}
          {p.video_url && <video src={p.video_url} controls style={{ width:"100%" }} />}
        </div>
      ))}

    </div>
  );

  return null;
}
