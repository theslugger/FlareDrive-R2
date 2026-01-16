import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
// 获取用户信息
  const { user } = context.data;

  // 如果没登录 且 没开启访客模式
  if (!user && !context.env.GUEST) {
    // 关键修改在这里：添加 WWW-Authenticate 头
    return new Response("Unauthorized", {
      status: 401,
      headers: { 
        // 👇 这行代码会召唤浏览器的登录弹窗！
        "WWW-Authenticate": 'Basic realm="FlareDrive R2"',
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    const objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!path)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(JSON.stringify({ value: objKeys, folders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
