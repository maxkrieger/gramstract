import { useCallback, useEffect, useState } from "react";

const LIMIT = 100;
const getArticleIds = async (start: number): Promise<string[]> => {
  const params = {
    db: "pubmed",
    retmax: LIMIT.toString(),
    retstart: start.toString(),
    retmode: "json",
    sort: "date",
    term: `"Cell"[Journal]`,
  };
  const search = new URLSearchParams(params).toString();
  const res = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${search}`
  );
  const json = await res.json();
  if (json?.esearchresult?.idlist) {
    return json.esearchresult.idlist;
  }
  return [];
};
const getArticleMeta = async (ids: string[]): Promise<any> => {
  const params = {
    db: "pubmed",
    retmode: "json",
    id: ids.join(","),
  };
  const search = new URLSearchParams(params).toString();
  try {
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${search}`,
      { mode: "cors" }
    );
    const json = await res.json();
    if (json?.result) {
      return json.result;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
  return null;
};

const getImageURL = (pii: string) => {
  const replaced = pii.replace(/[^a-z0-9]/gi, "");
  return `https://ars.els-cdn.com/content/image/1-s2.0-${replaced}-fx1_lrg.jpg`;
};

const cleanResult = (meta: any) => {
  const pii: string = meta.articleids.find(
    (id: any) => id.idtype === "pii"
  ).value;
  const img = getImageURL(pii);
  if (meta.attributes.length === 0) {
    return null;
  }
  return {
    imgSrc: img,
    title: meta.title,
    status: meta.recordstatus,
    id: meta.uid,
    pii,
  };
};

function App() {
  const [articles, setArticles] = useState<any[]>([]);
  const [startIdx, setStartIdx] = useState(0);
  const [loadState, setLoadState] = useState<
    | "loading IDs"
    | "loading metadata"
    | "loaded"
    | "loading more"
    | "failed to load, refresh"
  >("loading IDs");
  const [imageSize, setImageSize] = useState(400);
  const [hoverId, setHoverId] = useState("");
  useEffect(() => {
    (async () => {
      const ids = await getArticleIds(0);
      setLoadState("loading metadata");
      const metas = await getArticleMeta(ids);
      const mapped = ids
        .map((id) => cleanResult(metas[id]))
        .filter((item) => item !== null);
      setArticles(mapped);
      setLoadState("loaded");
    })();
  }, []);
  const removeIdx = useCallback(
    (idx: number, articleId: string) => {
      const newArticles = [...articles];
      if (newArticles[idx].id === articleId) {
        newArticles.splice(idx, 1);
      }
      setArticles(newArticles);
    },
    [articles]
  );
  const onRequestMore = useCallback(() => {
    (async () => {
      setLoadState("loading more");
      const ids = await getArticleIds(startIdx + LIMIT);
      setStartIdx((s) => s + LIMIT);
      const metas = await getArticleMeta(ids);
      if (metas === null) {
        setLoadState("failed to load, refresh");
        return;
      }
      const mapped = ids
        .map((id) => cleanResult(metas[id]))
        .filter((item) => item !== null);
      setArticles(articles.concat(mapped));
      setLoadState("loaded");
    })();
  }, [startIdx, articles]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, padding: 0, fontSize: "18px" }}>
          Cell Graphical Abstracts Browser
        </h1>
        <div>
          <label>
            image size
            <input
              type="range"
              min="100"
              max="1000"
              value={imageSize}
              onChange={(e) => setImageSize(parseInt(e.target.value, 10))}
            />
          </label>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          flex: 1,
          overflow: "auto",
        }}
      >
        {loadState !== "loaded" && articles.length === 0 && (
          <h1>{loadState}</h1>
        )}
        {articles.map((article, idx) => (
          <a
            href={`https://www.cell.com/cell/fulltext/${article.pii}`}
            key={article.id}
            onMouseOver={() => setHoverId(article.id)}
          >
            <div style={{ margin: "5px", position: "relative" }}>
              {hoverId === article.id && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 1000,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    boxShadow: "var(--shadow-elevation-medium)",
                  }}
                >
                  <h4>{article.title}</h4>
                </div>
              )}

              <img
                onError={() => removeIdx(idx, article.id)}
                src={article.imgSrc}
                width={imageSize}
                alt={article.title}
              />
            </div>
          </a>
        ))}
        <div
          style={{
            width: "100%",
            height: "200px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button onClick={onRequestMore}>
            {loadState === "loading more" ? "loading..." : "more"}
          </button>
          <h5>
            <a href="https://github.com/maxkrieger/gramstract">
              fork on GitHub
            </a>
            . this is unofficial. please support open access however you see fit
          </h5>
        </div>
      </div>
    </div>
  );
}

export default App;
