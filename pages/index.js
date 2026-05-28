import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wifiizqxiuynrkb.supabase.co",
  "sb_publishable_ZNiCaBJE9siL-HMJd8ZtHQ_-2M5te7H"
);

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

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", username: "", password: "" });

  const [newPost, setNewPost] = useState("");

  // ✅ 新增：媒体文件
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

  // ---------------- 登录（修复版，不用 single） ----------------
  const login = async () => {
    const username = loginForm.username.trim();
    const password = loginForm.password.trim();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password);

    console.log("login data:", data, error);

    if (error) return alert(error.message);

    if (!data || data.length === 0) {
      return alert("用户名或密码错误");
    }

    const u = data[0];

    if (u.status === "pending") {
      return alert("账号审核中");
    }

    setUser(u);
    localStorage.setItem("raner_user", JSON.stringify(u));
    setPage("feed");
  };

  const register = async () => {
    await supabase.from("users").insert({
      ...regForm,
      role: "viewer",
      status: "pending"
    });

    alert("注册成功");
  };

  // ---------------- 上传文件（新增核心） ----------------
  const uploadMedia = async (file) => {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, file);

    if (error) {
      console.log("upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // ---------------- 发布动态（新增图片/视频） ----------------
  const publishPost = async () => {
    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      mediaUrl = await uploadMedia(mediaFile);
      mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
    }

    await supabase.from("posts").insert({
      content: newPost,
      author_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType
    });

    setNewPost("");
    setMediaFile(null);
    loadPosts();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("raner_user");
    setPage("login");
  };

  // ---------------- UI（完全不动你的原风格） ----------------

  if (page === "login") return (
    <div style={{ display:"flex", justifyContent:"center", marginTop:100 }}>
      <div style={{ textAlign:"center" }}>
        <Tree />
        <input placeholder="用户名"
          onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}/>
        <input placeholder="密码" type="password"
          onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}/>
        <button onClick={login}>登录</button>
        <button onClick={()=>setPage("register")}>注册</button>
      </div>
    </div>
  );

  if (page === "register") return (
    <div style={{ textAlign:"center", marginTop:100 }}>
      <Tree />
      <input placeholder="名字"
        onChange={e=>setRegForm(p=>({...p,name:e.target.value}))}/>
      <input placeholder="用户名"
        onChange={e=>setRegForm(p=>({...p,username:e.target.value}))}/>
      <input placeholder="密码"
        onChange={e=>setRegForm(p=>({...p,password:e.target.value}))}/>
      <button onClick={register}>提交</button>
    </div>
  );

  return (
    <div>
      <button onClick={logout}>退出</button>

      {/* 发布区域（只新增，不改UI结构） */}
      <div>
        <textarea
          value={newPost}
          onChange={e=>setNewPost(e.target.value)}
          placeholder="说点什么..."
        />

        {/* ✅新增上传入口 */}
        <input
          type="file"
          accept="image/*,video/*"
          onChange={e=>setMediaFile(e.target.files[0])}
        />

        <button onClick={publishPost}>发布</button>
      </div>

      {/* feed展示（只新增媒体展示） */}
      {posts.map(p=>(
        <div key={p.id} style={{border:"1px solid #ddd",margin:10,padding:10}}>
          <p>{p.content}</p>

          {p.media_type === "image" && p.media_url && (
            <img src={p.media_url} style={{width:200}} />
          )}

          {p.media_type === "video" && p.media_url && (
            <video src={p.media_url} controls style={{width:200}} />
          )}
        </div>
      ))}
    </div>
  );
}
