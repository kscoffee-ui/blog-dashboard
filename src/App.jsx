import { db, auth } from "./firebase";
import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where
} from "firebase/firestore";
import {
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "firebase/auth";

import { PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";

import { useRef } from "react";

function App() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const articleRefs = useRef({});
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKeyword, setEditKeyword] = useState("");

  const [openId, setOpenId] = useState(null);

  const [seoState, setSeoState] = useState({});

  const provider = new GoogleAuthProvider();

  const handleLogout = async () => {
  await signOut(auth);
  setUser(null);
  setArticles([]);
};
  const generateDummy = () => ({
    pv: Math.floor(Math.random() * 200),
    impressions: Math.floor(Math.random() * 5000),
    ctr: (Math.random() * 3).toFixed(2)
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchArticles(u);
    });
    return () => unsub();
  }, []);

  const formatUrl = (index) => `/article-${index + 1}/`;

  const fetchArticles = async (u) => {
    const q = query(collection(db, "articles"), where("userId", "==", u.uid));
    const snap = await getDocs(q);

    const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const merged = base.map((a, index) => ({
      ...a,
      ...generateDummy(),
      displayUrl: formatUrl(index)
    }));

    setArticles(merged);
  };

  const addArticle = async () => {
    if (!title || !user) return;

    await addDoc(collection(db, "articles"), {
      title,
      keyword,
      status: "未対策",
      userId: user.uid
    });

    setTitle("");
    setKeyword("");
    fetchArticles(user);
  };

  const changeStatus = async (id, status) => {
    await updateDoc(doc(db, "articles", id), { status });

    setArticles(prev =>
      prev.map(a => (a.id === id ? { ...a, status } : a))
    );
  };

  const deleteArticle = async (id) => {
    if (!confirm("削除する？")) return;
    await deleteDoc(doc(db, "articles", id));
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditKeyword(a.keyword);
  };

  const saveEdit = async (id) => {
    await updateDoc(doc(db, "articles", id), {
      title: editTitle,
      keyword: editKeyword
    });

    setArticles(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, title: editTitle, keyword: editKeyword }
          : a
      )
    );

    setEditingId(null);
  };

  const getSuggestion = (a) => {
    if (a.impressions > 3000 && a.ctr < 1) return "タイトル改善推奨";
    if (a.pv < 50) return "リライト推奨";
    return "良好";
  };

  const rankedArticles = [...articles]
    .map(a => ({
      ...a,
      score:
        (a.impressions > 3000 && a.ctr < 1 ? 100 : 0) +
        (a.pv < 50 ? 50 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const filteredArticles =
    filterStatus === "ALL"
      ? articles
      : articles.filter(a => a.status === filterStatus);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <button
          onClick={() => signInWithPopup(auth, provider)}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  const total = articles.length;
  const done = articles.filter(a => a.status === "完了").length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const chartData = [
    { name: "未対策", value: articles.filter(a => a.status === "未対策").length },
    { name: "リライト中", value: articles.filter(a => a.status === "リライト中").length },
    { name: "完了", value: done },
  ];
  const getStatusColor = (status) => {
  if (status === "未対策") return "bg-red-400";
  if (status === "リライト中") return "bg-yellow-400";
  if (status === "完了") return "bg-green-400";
  return "bg-gray-300";
};
  return (
    <div className="flex-1 p-8 bg-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold">記事改善ダッシュボード</h1>
  <button
    onClick={handleLogout}
    className="bg-red-500 text-white px-4 py-2 rounded"
  >
    ログアウト
  </button>
</div>

        {/* 入力 */}
        <div className="bg-white p-4 rounded-xl shadow flex gap-2">
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            placeholder="記事タイトル"
            className="flex-1 border rounded px-3 py-2"
          />
          <input
            value={keyword}
            onChange={(e)=>setKeyword(e.target.value)}
            placeholder="キーワード"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={addArticle}
            className="bg-black text-white px-4 py-2 rounded"
          >
            追加
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">記事数</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">未対策</p>
            <p className="text-2xl font-bold">
              {articles.filter(a=>a.status==="未対策").length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm">完了率</p>
            <p className="text-2xl font-bold">{rate}%</p>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex gap-2">
          {["ALL","未対策","リライト中","完了"].map(s => (
            <button
              key={s}
              onClick={()=>setFilterStatus(s)}
              className={`px-3 py-1 rounded ${
                filterStatus === s ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              {s === "ALL" ? "全て" : s}
            </button>
          ))}
        </div>

        {/* 🔥 ランキング（順位表示） */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-bold mb-2">改善優先記事</h2>
          {rankedArticles.map((a, index) => (
  <div
    key={a.id}
    onClick={() => {
      // ① アコーディオン開く
      setOpenId(a.id);

setTimeout(() => {
  articleRefs.current[a.id]?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}, 100);

      // ③ SEO state初期化（重要）
      setSeoState(prev => ({
        ...prev,
        [a.id]: {
          seoTitle: a.seoTitle || "",
          url: a.url || "",
          meta: a.metaDescription || ""
        }
      }));
    }}
    className="text-sm border-b py-2 flex justify-center cursor-pointer hover:bg-gray-100"
  >
  <div className="flex gap-2 items-center">
    <span className={`font-bold ${
      index === 0 ? "text-yellow-500" :
      index === 1 ? "text-gray-400" :
      index === 2 ? "text-orange-400" :
      "text-gray-500"
    }`}>
      {index + 1}位
    </span>
    <span className="text-center">{a.title}</span>
  </div>
</div>
          ))}
        </div>

        {/* 🔥 グラフ修正 */}
        <div className="bg-white p-6 rounded-xl shadow flex justify-center">
          <PieChart width={350} height={300}>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={100}
              onClick={(data) => setFilterStatus(data.name)}
            >
              <Cell fill="#fd0707c9" />
              <Cell fill="#FACC15" />
              <Cell fill="#34D399" />
              <Label
                value={`完了率\n${rate}%`}
                position="center"
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAnchor: "middle"
                }}
              />
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        {/* 一覧（そのまま） */}
        <div className="space-y-3">
  {filteredArticles.map(a => (
    <div
  key={a.id}
  ref={(el) => (articleRefs.current[a.id] = el)}
      onClick={() => {
        setOpenId(openId === a.id ? null : a.id);

        setSeoState(prev => ({
          ...prev,
          [a.id]: {
            seoTitle: a.seoTitle || "",
            url: a.url || "",
            meta: a.metaDescription || ""
          }
        }));
      }}
      className="bg-white p-4 rounded-xl shadow cursor-pointer"
    >

      {/* 上段 */}
     <div className="flex justify-between">
  <div>

    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${getStatusColor(a.status)}`}
      ></div>

      <p className="font-semibold">{a.title}</p>
    </div>

    <p className="text-sm text-gray-500">{a.keyword}</p>

    <p className="text-xs text-gray-400">
      PV: {a.pv} / CTR: {a.ctr}% / Imp: {a.impressions}
    </p>

  </div>

        <div className="flex gap-2">
          <button onClick={(e)=>{e.stopPropagation(); changeStatus(a.id,"未対策")}} className="px-5 py-1 bg-red-400 rounded">未</button>
          <button onClick={(e)=>{e.stopPropagation(); changeStatus(a.id,"リライト中")}} className="px-5 py-1 bg-yellow-400 rounded">中</button>
          <button onClick={(e)=>{e.stopPropagation(); changeStatus(a.id,"完了")}} className="px-5 py-1 bg-green-400 rounded">完</button>
 
        </div>
      </div>

      {/* 🔽 アコーディオン */}
      {openId === a.id && (
        <div
          className="mt-4 p-3 bg-gray-50 rounded border space-y-2"
          onClick={(e) => e.stopPropagation()} // ←これも重要
        >

          <input
            value={seoState[a.id]?.seoTitle || ""}
            onChange={(e)=>
              setSeoState(prev => ({
                ...prev,
                [a.id]: {
                  ...prev[a.id],
                  seoTitle: e.target.value
                }
              }))
            }
            placeholder="SEOタイトル"
            className="w-full border px-2 py-1 rounded"
          />

          <input
            value={seoState[a.id]?.url || ""}
            onChange={(e)=>
              setSeoState(prev => ({
                ...prev,
                [a.id]: {
                  ...prev[a.id],
                  url: e.target.value
                }
              }))
            }
            placeholder="スラッグ（URL）"
            className="w-full border px-2 py-1 rounded"
          />

          <textarea
            value={seoState[a.id]?.meta || ""}
            onChange={(e)=>
              setSeoState(prev => ({
                ...prev,
                [a.id]: {
                  ...prev[a.id],
                  meta: e.target.value
                }
              }))
            }
            placeholder="メタディスクリプション"
            className="w-full border px-2 py-1 rounded"
          />
<div className="flex gap-2">
  
  {/* AIタイトル */}
  <button
    onClick={async (e) => {
      e.stopPropagation();

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "title",
            title: a.title,
            keyword: a.keyword
          })
        });

        const data = await res.json();

        setSeoState(prev => ({
          ...prev,
          [a.id]: {
            ...prev[a.id],
            seoTitle: data.text
          }
        }));

      } catch (err) {
  console.error("AIエラー:", err); // ←追加
  alert("AI生成失敗");
}
    }}
    className="bg-purple-500 text-white px-3 py-1 rounded"
  >
    AIタイトル
  </button>

 {/* AI説明 */}
<button
  onClick={async (e) => {
    e.stopPropagation();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "desc",   // ←修正
          title: a.title
        })
      });

      const data = await res.json();

      setSeoState(prev => ({
        ...prev,
        [a.id]: {
          ...(prev[a.id] || {}),
          meta: data.text   // ←修正
        }
      }));

    } catch (err) {
      console.error("AIエラー:", err);
      alert("AI生成失敗");
    }
  }}
  className="bg-green-500 text-white px-3 py-1 rounded"
>
  AI説明
</button>

</div>
          <button
            onClick={async (e) => {
              e.stopPropagation();

              const data = seoState[a.id];

              await updateDoc(doc(db, "articles", a.id), {
                seoTitle: data.seoTitle,
                url: data.url,
                metaDescription: data.meta
              });

              fetchArticles(user);
            }}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            保存
          </button>
<button
  onClick={async (e) => {
    e.stopPropagation();

    if (!confirm("本当に削除する？")) return;

    await deleteDoc(doc(db, "articles", a.id));

    setArticles(prev => prev.filter(item => item.id !== a.id));
    setOpenId(null); // ←閉じる
  }}
  className="bg-red-500 text-white px-3 py-1 rounded"
>
  削除
</button>
        </div>
      )}
    </div>
  ))}
</div>

      </div>
    </div>
  );
}

export default App;