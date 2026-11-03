"use strict";var GeoAnalyzerEngine=(()=>{var L=Object.defineProperty;var it=Object.getOwnPropertyDescriptor;var ot=Object.getOwnPropertyNames;var rt=Object.prototype.hasOwnProperty;var at=(t,e)=>{for(var s in e)L(t,s,{get:e[s],enumerable:!0})},ct=(t,e,s,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of ot(e))!rt.call(t,n)&&n!==s&&L(t,n,{get:()=>e[n],enumerable:!(i=it(e,n))||i.enumerable});return t};var lt=t=>ct(L({},"__esModule",{value:!0}),t);var Mt={};at(Mt,{analyzeHTMLCode:()=>$,analyzeParsedPage:()=>z,generateFaqSchema:()=>k,isMeaninglessAlt:()=>A,parseHTML:()=>T});var ut=["image","img","photo","picture","\u56FE\u7247","\u7167\u7247","\u56FE\u50CF","icon","logo","banner","thumb","thumbnail","1","0","test","untitled","no name",""," "],pt=["\u5C55\u793A","\u663E\u793A","\u4ECB\u7ECD","\u8BF4\u660E","\u56FE\u89E3","\u793A\u610F\u56FE","\u6B63\u9762","\u80CC\u9762","\u4FA7\u9762","\u5916\u89C2","\u7EC6\u8282","\u7279\u5199","\u5168\u666F","\u5BF9\u6BD4","\u4F7F\u7528","\u64CD\u4F5C","\u754C\u9762","\u622A\u56FE","\u573A\u666F","\u6548\u679C","\u529F\u80FD","\u7279\u70B9","\u4F18\u52BF","\u53C2\u6570","\u89C4\u683C","\u914D\u7F6E","show","display","view","detail","close-up","overview","screenshot","interface","dashboard","diagram","illustration","photo of","image of"],ht=["apple","samsung","sony","huawei","xiaomi","oppo","vivo","google","microsoft","amazon","tesla","nike","adidas","iphone","ipad","macbook","airpods","galaxy","pixel","apple","\u534E\u4E3A","\u5C0F\u7C73","\u4E09\u661F","\u7D22\u5C3C","oppo","vivo","\u8363\u8000"];function A(t){let e=t.trim(),s=e.toLowerCase();if(ut.includes(s))return!0;let i=/[\u4e00-\u9fa5]/.test(e);if(i&&e.length<=4||!i&&e.length<=15&&(/^[A-Z][a-zA-Z]*\s*\d+[A-Z]*\s*[A-Za-z]*$/.test(e)||ht.includes(s)||/^[A-Z0-9\s\-]+$/.test(e)&&e.length<=10))return!0;let n=pt.some(a=>s.includes(a));return!n&&e.split(/\s+/).length<=3&&!n}function M(t){try{return(new URL(t).pathname.split("/").pop()||"").replace(/\.[^.]+$/,"").replace(/[-_]/g," ").trim()}catch(e){return(t.split("/").pop()||t).replace(/\.[^.]+$/,"").replace(/[-_]/g," ").trim()}}function $(t){let e=[],s=0,i=0,n=0,a=/<img\b([^>]*)>/gi,p;for(;(p=a.exec(t))!==null;){s++;let c=p[1],g=c.match(/src=["']([^"']+)["']/i),f=c.match(/alt=["']([^"']*)["']/i);if(f){let u=f[1];if(A(u)){n++;let d=t.substring(0,p.index).split(`
`).length,x=g?g[1]:"",h=x?M(x):"",y="";u.trim()===""?y="alt \u4E3A\u7A7A":u.length<=4&&/[\u4e00-\u9fa5]/.test(u)?y=`alt "${u}" \u8FC7\u77ED\uFF0C\u4EC5\u4E3A\u540D\u8BCD\uFF0C\u7F3A\u5C11\u63CF\u8FF0\u6027\u5185\u5BB9`:u.length<=15&&!/[\u4e00-\u9fa5]/.test(u)?y=`alt "${u}" \u4EC5\u4E3A\u4EA7\u54C1\u540D/\u578B\u53F7\uFF0C\u7F3A\u5C11\u5BF9\u56FE\u7247\u5185\u5BB9\u7684\u63CF\u8FF0`:y=`alt "${u}" \u65E0\u5B9E\u9645\u63CF\u8FF0\u610F\u4E49`;let w=h?`${h}\u7684\u4EA7\u54C1\u5C55\u793A\u56FE\uFF0C\u63CF\u8FF0\u56FE\u7247\u4E2D\u7684\u5177\u4F53\u5185\u5BB9\u548C\u573A\u666F`:"\u8BF7\u63CF\u8FF0\u56FE\u7247\u5185\u5BB9\uFF0C\u5305\u62EC\u4E3B\u4F53\u3001\u573A\u666F\u548C\u5173\u952E\u4FE1\u606F";e.push({line:d,original:p[0],type:u.trim()===""?"empty":"meaningless",suggestion:w,src:x||void 0}),e[e.length-1].reason=y}else i++}else{n++;let u=t.substring(0,p.index).split(`
`).length,d=g?g[1]:"",x=d?M(d):"",h=x?`${x}\u7684\u4EA7\u54C1\u5C55\u793A\u56FE\uFF0C\u63CF\u8FF0\u56FE\u7247\u4E2D\u7684\u5177\u4F53\u5185\u5BB9\u548C\u573A\u666F`:"\u8BF7\u63CF\u8FF0\u56FE\u7247\u5185\u5BB9\uFF0C\u5305\u62EC\u4E3B\u4F53\u3001\u573A\u666F\u548C\u5173\u952E\u4FE1\u606F";e.push({line:u,original:p[0],type:"missing",suggestion:h,src:d||void 0})}}let l=[],o=/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?FAQPage[\s\S]*?<\/script>/i.test(t)||/itemtype=["']https:\/\/schema\.org\/Question["']/i.test(t);o||l.push({type:"missing",suggestion:"\u9875\u9762\u7F3A\u5C11 FAQ Schema \u7ED3\u6784\u5316\u6570\u636E\uFF0C\u5EFA\u8BAE\u6DFB\u52A0\u5E38\u89C1\u95EE\u9898\u95EE\u7B54\u6A21\u5757"});let r=t;for(let c of e){let g=c.original.match(/src=["']([^"']+)["']/i),f=g?g[1]:"",u=f?`\u63CF\u8FF0${M(f)}\u7684\u56FE\u7247\u5185\u5BB9`:"\u8BF7\u63CF\u8FF0\u56FE\u7247\u5185\u5BB9";c.type==="missing"?r=r.replace(c.original,c.original.replace(/<img\b/i,`<img alt="${u}"`)):r=r.replace(c.original,c.original.replace(/alt=["'][^"']*["']/i,`alt="${u}"`))}return o||(r+=`
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "\u4F60\u7684\u5E38\u89C1\u95EE\u9898\u662F\u4EC0\u4E48\uFF1F",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "\u8FD9\u91CC\u662F\u8BE6\u7EC6\u7684\u56DE\u7B54\u5185\u5BB9\u3002"
      }
    }
  ]
}
</script>`),{altIssues:e,faqIssues:l,optimizedCode:r,stats:{totalImages:s,imagesWithAlt:i,imagesWithoutAlt:n,hasFaqSchema:o}}}function k(t){return`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${t.map(s=>`    {
      "@type": "Question",
      "name": "${s.q}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${s.a}"
      }
    }`).join(`,
`)}
  ]
}
</script>`}function T(t,e){let s=t.match(/<title[^>]*>([\s\S]*?)<\/title>/i),i=s?s[1].trim():"",n=t.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i),a=n?n[1].trim():"",p=t.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([\s\S]*?)["']/i),l=p?p[1].trim():"",o={},r=/<meta[^>]*property=["']og:(\w+)["'][^>]*content=["']([\s\S]*?)["']/gi,c;for(;(c=r.exec(t))!==null;)o[c[1]]=c[2].trim();let g=[],f=/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi,u;for(;(u=f.exec(t))!==null;){let m=u[2].replace(/<[^>]+>/g,"").trim();g.push({tag:u[1].toLowerCase(),text:m})}let d=new URL(e),x=[],h=/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,y;for(;(y=h.exec(t))!==null;){let m=y[1],C=y[2].replace(/<[^>]+>/g,"").trim(),S=!1;try{S=new URL(m,e).hostname!==d.hostname}catch(nt){}x.push({href:m,text:C,isExternal:S})}let w=[],W=/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["']/gi,b;for(;(b=W.exec(t))!==null;)w.push({src:b[1],alt:b[2]});let X=/<img[^>]*src=["']([^"']+)["'][^>]*(?!.*alt=)/gi,P;for(;(P=X.exec(t))!==null;)w.find(m=>m.src===P[1])||w.push({src:P[1],alt:""});let I=[],_=/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,F;for(;(F=_.exec(t))!==null;)try{let m=JSON.parse(F[1]);I.push(m)}catch(m){}let R=t.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),B=R?R[1]:"",E=t.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i),K=E?E[1]:"",q=t.match(/<html[^>]*lang=["']([^"']+)["']/i),V=q?q[1]:"",H=t.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),Z=H.split(/\s+/).filter(Boolean).length,Q=[],J=/<p[^>]*>([\s\S]*?)<\/p>/gi,D;for(;(D=J.exec(t))!==null;){let m=D[1].replace(/<[^>]+>/g,"").trim();m.length>20&&Q.push(m)}let O=[],Y=/<li[^>]*>([\s\S]*?)<\/li>/gi,U;for(;(U=Y.exec(t))!==null;)O.push(U[1].replace(/<[^>]+>/g,"").trim());let j=[],tt=/<table[\s\S]*?<\/table>/gi,N;for(;(N=tt.exec(t))!==null;)j.push(N[0]);let G=[],v=I.find(m=>m["@type"]==="FAQPage"||m["@type"]==="Question");if(v&&"mainEntity"in v){let m=v.mainEntity;Array.isArray(m)&&m.forEach(C=>{var S;C.name&&((S=C.acceptedAnswer)!=null&&S.text)&&G.push({question:C.name,answer:C.acceptedAnswer.text.replace(/<[^>]+>/g,"")})})}let et=t.includes("sitemap.xml")||t.includes("/sitemap")||x.some(m=>m.href.includes("sitemap")),st=t.includes("favicon")||t.includes("icon")||/<link[^>]*rel=["'](icon|shortcut icon)["']/i.test(t);return{url:e,html:t,title:i,metaDescription:a,metaKeywords:l,ogTags:o,headings:g,links:x,images:w,schemaMarkup:I,canonicalUrl:B,robotsMeta:K,lang:V,hasSitemap:et,hasFavicon:st,wordCount:Z,paragraphs:Q,lists:O,tables:j,faqContent:G,textContent:H}}function gt(t){let e=[],s=[],i=100;return t.robotsMeta.includes("noindex")&&(e.push("\u9875\u9762\u8BBE\u7F6E\u4E86 noindex\uFF0C\u641C\u7D22\u5F15\u64CE\u65E0\u6CD5\u7D22\u5F15\u6B64\u9875\u9762"),s.push("\u5982\u679C\u9875\u9762\u9700\u8981\u88AB\u7D22\u5F15\uFF0C\u79FB\u9664 noindex \u6307\u4EE4"),i-=30),t.canonicalUrl||(e.push("\u7F3A\u5C11 canonical URL\uFF0C\u53EF\u80FD\u5BFC\u81F4\u91CD\u590D\u5185\u5BB9\u95EE\u9898"),s.push('\u6DFB\u52A0 <link rel="canonical" href="..."> \u6807\u7B7E'),i-=15),t.lang||(e.push("HTML \u6807\u7B7E\u7F3A\u5C11 lang \u5C5E\u6027"),s.push('\u5728 <html> \u6807\u7B7E\u4E2D\u6DFB\u52A0 lang \u5C5E\u6027\uFF0C\u5982 lang="zh-CN"'),i-=10),t.hasSitemap||(e.push("\u672A\u53D1\u73B0 sitemap \u5F15\u7528"),s.push("\u521B\u5EFA\u5E76\u63D0\u4EA4 XML sitemap \u4EE5\u5E2E\u52A9\u641C\u7D22\u5F15\u64CE\u53D1\u73B0\u9875\u9762"),i-=10),t.hasFavicon||(e.push("\u7F3A\u5C11 favicon \u914D\u7F6E"),s.push("\u6DFB\u52A0 favicon \u4EE5\u63D0\u5347\u54C1\u724C\u8BC6\u522B\u5EA6"),i-=5),t.html.length<500&&(e.push("\u9875\u9762 HTML \u5185\u5BB9\u8FC7\u5C11\uFF0C\u53EF\u80FD\u4E0D\u5229\u4E8E\u722C\u53D6\u5206\u6790"),s.push("\u786E\u4FDD\u9875\u9762\u6709\u8DB3\u591F\u7684\u5B9E\u8D28\u6027\u5185\u5BB9"),i-=15),e.length===0&&s.push("\u722C\u53D6\u6027\u826F\u597D\uFF0C\u7EE7\u7EED\u4FDD\u6301"),{name:"Crawlability",score:Math.max(0,i),issues:e,suggestions:s}}function dt(t){let e=[],s=[],i=100,n=t.images.length;if(n>0){let a=t.images.filter(o=>o.alt.trim()==="").length,p=t.images.filter(o=>o.alt.trim()!==""&&A(o.alt)).length,l=a+p;if(l>0){let o=n-l,r=Math.round(o/n*100),c=[];a>0&&c.push(`${a} \u5F20\u7F3A\u5931`),p>0&&c.push(`${p} \u5F20\u65E0\u610F\u4E49\uFF08\u5982 "img"\u3001"\u56FE\u7247"\uFF09`),e.push(`${l}/${n} \u5F20\u56FE\u7247 alt \u65E0\u6548\uFF08${c.join("\u3001")}\uFF09\uFF0C\u6709\u6548\u8986\u76D6\u7387 ${r}%`),s.push("\u4E3A alt \u65E0\u6548\u7684\u56FE\u7247\u8865\u5145\u63CF\u8FF0\u6027 alt\uFF08\u63CF\u8FF0\u56FE\u7247\u5185\u5BB9\u4E0E\u6240\u5728\u573A\u666F\uFF09\uFF0C\u5C06\u6709\u6548\u8986\u76D6\u7387\u63D0\u5347\u81F3 90% \u4EE5\u4E0A"),i-=Math.round(l/n*50)}}return t.wordCount<300&&(e.push(`\u9875\u9762\u6587\u5B57\u5185\u5BB9\u4EC5 ${t.wordCount} \u8BCD\uFF0C\u5185\u5BB9\u53EF\u80FD\u4E0D\u591F\u5145\u5206`),s.push("\u589E\u52A0\u9875\u9762\u7684\u5B9E\u8D28\u6027\u6587\u5B57\u5185\u5BB9\uFF0C\u5EFA\u8BAE\u81F3\u5C11 300 \u8BCD\u4EE5\u4E0A"),i-=20),t.lists.length===0&&t.wordCount>200&&(e.push("\u5185\u5BB9\u4E2D\u7F3A\u5C11\u7ED3\u6784\u5316\u5217\u8868"),s.push("\u4F7F\u7528 <ul>/<ol> \u5217\u8868\u6765\u7EC4\u7EC7\u8981\u70B9\u4FE1\u606F\uFF0C\u63D0\u5347\u53EF\u8BFB\u6027"),i-=10),e.length===0&&s.push("\u5185\u5BB9\u53EF\u8BBF\u95EE\u6027\u826F\u597D"),{name:"Content Accessibility",score:Math.max(0,i),issues:e,suggestions:s}}function mt(t){let e=[],s=[],i=100,n=t.headings.map(d=>d.tag),a=n.filter(d=>d==="h1").length,p=n.includes("h2"),l=n.includes("h3");a===0?(e.push("\u7F3A\u5C11 H1 \u4E3B\u6807\u9898"),s.push("\u6DFB\u52A0\u4E00\u4E2A\u660E\u786E\u7684 H1 \u6807\u9898\u6765\u63CF\u8FF0\u9875\u9762\u4E3B\u9898"),i-=20):a>1&&(e.push(`\u9875\u9762\u6709 ${a} \u4E2A H1 \u6807\u9898\uFF0C\u5EFA\u8BAE\u53EA\u4FDD\u7559\u4E00\u4E2A`),s.push("\u786E\u4FDD\u9875\u9762\u53EA\u6709\u4E00\u4E2A H1 \u4E3B\u6807\u9898"),i-=10),p||(e.push("\u7F3A\u5C11 H2 \u526F\u6807\u9898\uFF0C\u5185\u5BB9\u7ED3\u6784\u4E0D\u591F\u6E05\u6670"),s.push("\u4F7F\u7528 H2 \u5212\u5206\u4E3B\u8981\u7AE0\u8282"),i-=15),!l&&p&&(e.push("\u7F3A\u5C11 H3 \u5B50\u6807\u9898\uFF0C\u5C42\u7EA7\u7ED3\u6784\u53EF\u4EE5\u66F4\u4E30\u5BCC"),s.push("\u5728 H2 \u4E0B\u4F7F\u7528 H3 \u8FDB\u4E00\u6B65\u7EC6\u5206\u5185\u5BB9"),i-=5);let o=/<article[\s>]/i.test(t.html),r=/<section[\s>]/i.test(t.html),c=/<nav[\s>]/i.test(t.html),g=/<main[\s>]/i.test(t.html),f=/<aside[\s>]/i.test(t.html),u=[];g||u.push("main"),o||u.push("article"),r||u.push("section"),c||u.push("nav"),u.length>0&&(e.push(`\u7F3A\u5C11\u8BED\u4E49\u5316 HTML5 \u6807\u7B7E: ${u.join(", ")}`),s.push(`\u4F7F\u7528 ${u.join(", ")} \u7B49\u8BED\u4E49\u5316\u6807\u7B7E\u7EC4\u7EC7\u9875\u9762\u7ED3\u6784`),i-=u.length*5);for(let d=1;d<n.length;d++){let x=parseInt(n[d-1].charAt(1));if(parseInt(n[d].charAt(1))>x+1){e.push(`\u6807\u9898\u5C42\u7EA7\u8DF3\u8DC3: ${n[d-1].toUpperCase()} \u540E\u76F4\u63A5\u8DDF ${n[d].toUpperCase()}`),s.push("\u4FDD\u6301\u6807\u9898\u5C42\u7EA7\u8FDE\u7EED\uFF0C\u4E0D\u8981\u8DF3\u7EA7"),i-=5;break}}return e.length===0&&s.push("\u8BED\u4E49\u7ED3\u6784\u826F\u597D"),{name:"Semantic Structure",score:Math.max(0,i),issues:e,suggestions:s}}function ft(t){let e=[],s=[],i=100;if(t.schemaMarkup.length===0)e.push("\u9875\u9762\u6CA1\u6709\u4EFB\u4F55 Schema \u7ED3\u6784\u5316\u6570\u636E (JSON-LD)"),s.push("\u6DFB\u52A0 JSON-LD \u683C\u5F0F\u7684 Schema \u6807\u8BB0\uFF0C\u5982 Organization\u3001Product\u3001Article \u7B49"),i-=40;else{let a=t.schemaMarkup.map(p=>p["@type"]);!a.includes("Organization")&&!a.includes("WebSite")&&(e.push("\u7F3A\u5C11 Organization \u6216 WebSite \u7C7B\u578B\u7684 Schema"),s.push("\u6DFB\u52A0 Organization \u6216 WebSite Schema \u6765\u5B9A\u4E49\u7F51\u7AD9\u8EAB\u4EFD"),i-=15),a.includes("BreadcrumbList")||(e.push("\u7F3A\u5C11 BreadcrumbList Schema"),s.push("\u6DFB\u52A0\u9762\u5305\u5C51\u5BFC\u822A Schema \u5E2E\u52A9\u641C\u7D22\u5F15\u64CE\u7406\u89E3\u9875\u9762\u5C42\u7EA7"),i-=10),!a.includes("FAQPage")&&t.faqContent.length===0&&(e.push("\u7F3A\u5C11 FAQ Schema"),s.push("\u5982\u679C\u9875\u9762\u6709\u95EE\u7B54\u5185\u5BB9\uFF0C\u6DFB\u52A0 FAQPage Schema \u589E\u5F3A AI \u7406\u89E3"),i-=10)}return t.html.includes("itemtype")||t.html.includes("itemscope")||t.schemaMarkup.length>0||(e.push("\u9875\u9762\u7F3A\u5C11\u660E\u786E\u7684\u5B9E\u4F53\u5B9A\u4E49"),s.push("\u4F7F\u7528 Schema.org \u8BCD\u6C47\u6807\u8BB0\u9875\u9762\u4E2D\u7684\u5173\u952E\u5B9E\u4F53\uFF08\u4EA7\u54C1\u3001\u4EBA\u7269\u3001\u7EC4\u7EC7\u7B49\uFF09"),i-=15),e.length===0&&s.push("\u5B9E\u4F53\u4E0E Schema \u6807\u8BB0\u5B8C\u5584"),{name:"Entity & Schema",score:Math.max(0,i),issues:e,suggestions:s}}function xt(t){let e=[],s=[],i=100,n=t.links.filter(o=>!o.isExternal),a=t.links.filter(o=>o.isExternal);n.length<3&&(e.push(`\u5185\u90E8\u94FE\u63A5\u4EC5 ${n.length} \u4E2A\uFF0C\u9875\u9762\u95F4\u5173\u8054\u5EA6\u4E0D\u8DB3`),s.push("\u589E\u52A0\u6307\u5411\u76F8\u5173\u9875\u9762\u7684\u5185\u90E8\u94FE\u63A5\uFF0C\u5EFA\u8BAE\u81F3\u5C11 5 \u4E2A\u4EE5\u4E0A"),i-=20);let p=t.links.filter(o=>!o.text||o.text.length<2);return p.length>0&&(e.push(`${p.length} \u4E2A\u94FE\u63A5\u7F3A\u5C11\u63CF\u8FF0\u6027\u951A\u6587\u672C`),s.push('\u4E3A\u94FE\u63A5\u6DFB\u52A0\u6709\u610F\u4E49\u7684\u951A\u6587\u672C\uFF0C\u907F\u514D"\u70B9\u51FB\u8FD9\u91CC"\u7B49\u6A21\u7CCA\u6587\u672C'),i-=10),a.length===0&&(e.push("\u7F3A\u5C11\u5916\u90E8\u6743\u5A01\u94FE\u63A5\u5F15\u7528"),s.push("\u9002\u5F53\u5F15\u7528\u6743\u5A01\u5916\u90E8\u8D44\u6E90\uFF0C\u589E\u5F3A\u5185\u5BB9\u53EF\u4FE1\u5EA6"),i-=10),!(t.html.includes("related")||t.html.includes("\u63A8\u8350")||t.html.includes("\u76F8\u5173\u9605\u8BFB")||t.textContent.toLowerCase().includes("see also")||t.textContent.toLowerCase().includes("related"))&&n.length<5&&(e.push("\u7F3A\u5C11\u76F8\u5173\u5185\u5BB9\u63A8\u8350\u533A\u57DF"),s.push('\u6DFB\u52A0"\u76F8\u5173\u5185\u5BB9"\u6216"\u63A8\u8350\u9605\u8BFB"\u6A21\u5757\uFF0C\u589E\u5F3A\u5185\u5BB9\u5173\u8054'),i-=10),e.length===0&&s.push("\u5185\u90E8\u4E0A\u4E0B\u6587\u5173\u8054\u826F\u597D"),{name:"Internal Context",score:Math.max(0,i),issues:e,suggestions:s}}function yt(t){let e=[],s=[],i=100;t.title?t.title.length>60&&(e.push(`title \u8FC7\u957F (${t.title.length} \u5B57\u7B26)\uFF0C\u53EF\u80FD\u88AB\u622A\u65AD`),s.push("\u5C06 title \u63A7\u5236\u5728 50-60 \u5B57\u7B26\u4EE5\u5185"),i-=5):(e.push("\u9875\u9762\u7F3A\u5C11 title \u6807\u7B7E"),s.push("\u6DFB\u52A0\u63CF\u8FF0\u6027\u7684 title \u6807\u7B7E\uFF0C\u63A7\u5236\u5728 50-60 \u5B57\u7B26\u5185"),i-=25),t.metaDescription?t.metaDescription.length<70&&(e.push("meta description \u8FC7\u77ED\uFF0C\u672A\u5145\u5206\u5229\u7528\u5C55\u793A\u7A7A\u95F4"),s.push("\u6269\u5C55 meta description \u5230 150-160 \u5B57\u7B26"),i-=10):(e.push("\u7F3A\u5C11 meta description"),s.push("\u6DFB\u52A0 meta description\uFF0C\u63A7\u5236\u5728 150-160 \u5B57\u7B26\uFF0C\u5305\u542B\u6838\u5FC3\u5173\u952E\u8BCD"),i-=20);let a=["title","description","image","type","url"].filter(l=>!t.ogTags[l]);return a.length>0&&(e.push(`\u7F3A\u5C11 Open Graph \u6807\u7B7E: ${a.join(", ")}`),s.push("\u6DFB\u52A0\u5B8C\u6574\u7684 OG \u6807\u7B7E\u4EE5\u4F18\u5316\u793E\u4EA4\u5206\u4EAB\u548C AI \u5F15\u7528\u5C55\u793A"),i-=a.length*3),t.html.includes("llms.txt")||t.html.includes("ai-summary")||t.html.includes("data-ai")||t.metaDescription.length>100||(e.push("\u7F3A\u5C11\u9762\u5411 AI \u5F15\u64CE\u7684\u4F18\u5316\u4FE1\u53F7"),s.push("\u8003\u8651\u6DFB\u52A0 llms.txt\u3001AI \u6458\u8981\u6807\u7B7E\u7B49\u9762\u5411 AI \u641C\u7D22\u5F15\u64CE\u7684\u4F18\u5316"),i-=10),e.length===0&&s.push("\u5143\u6570\u636E\u4E0E AI \u4FE1\u53F7\u5B8C\u5584"),{name:"Metadata & AI Signals",score:Math.max(0,i),issues:e,suggestions:s}}function wt(t){let e=[],s=[],i=100,n=t.textContent.toLowerCase();n.includes("specification")||n.includes("\u89C4\u683C")||n.includes("\u53C2\u6570")||n.includes("feature")||n.includes("\u529F\u80FD")||t.tables.length>0||(e.push("\u9875\u9762\u7F3A\u5C11\u5177\u4F53\u7684\u4EA7\u54C1\u89C4\u683C/\u53C2\u6570\u4FE1\u606F"),s.push("\u6DFB\u52A0\u4EA7\u54C1\u89C4\u683C\u8868\u683C\uFF0C\u5305\u542B\u5177\u4F53\u6570\u503C\u548C\u53C2\u6570\uFF0C\u4FBF\u4E8E AI \u5F15\u64CE\u63D0\u53D6\u4E8B\u5B9E"),i-=25),/\d+[\s]*[%mgkMGK]|\d+\.\d+|\$\d+/.test(t.textContent)||(e.push("\u5185\u5BB9\u4E2D\u7F3A\u5C11\u91CF\u5316\u6570\u636E"),s.push("\u6DFB\u52A0\u5177\u4F53\u6570\u5B57\u3001\u767E\u5206\u6BD4\u3001\u4EF7\u683C\u7B49\u91CF\u5316\u4FE1\u606F\uFF0C\u589E\u5F3A\u4E8B\u5B9E\u6027"),i-=15),/\bv?\d+\.\d+/.test(t.textContent)||n.includes("version")||n.includes("\u7248\u672C")||n.includes("updated")||n.includes("\u66F4\u65B0")||(e.push("\u7F3A\u5C11\u7248\u672C/\u66F4\u65B0\u65E5\u671F\u4FE1\u606F"),s.push("\u6807\u6CE8\u4EA7\u54C1\u7248\u672C\u548C\u5185\u5BB9\u7684\u6700\u540E\u66F4\u65B0\u65E5\u671F"),i-=10),e.length===0&&s.push("\u4EA7\u54C1\u4E8B\u5B9E\u4FE1\u606F\u5145\u5206");let o="",r=t.paragraphs.find(c=>/\d+[\s]*[%mgkMGK]|\d+\.\d+|\$\d+|specification|规格|参数/.test(c));return r&&(o=r.length>120?r.substring(0,120)+"...":r),{name:"Product Facts",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:o||void 0}}function Ct(t){let e=[],s=[],i=100;t.paragraphs.length<3&&(e.push(`\u9875\u9762\u6BB5\u843D\u5185\u5BB9\u4EC5 ${t.paragraphs.length} \u6BB5\uFF0C\u529F\u80FD\u8BF4\u660E\u53EF\u80FD\u4E0D\u591F\u8BE6\u7EC6`),s.push("\u4E3A\u6BCF\u4E2A\u6838\u5FC3\u529F\u80FD\u63D0\u4F9B\u72EC\u7ACB\u7684\u6BB5\u843D\u8BF4\u660E"),i-=20),t.lists.length>3||t.textContent.toLowerCase().includes("step")||t.textContent.toLowerCase().includes("\u6B65\u9AA4")||/(\d+[\.\)]\s)/.test(t.textContent)||(e.push("\u7F3A\u5C11\u6B65\u9AA4\u5316\u7684\u529F\u80FD\u8BF4\u660E"),s.push("\u4F7F\u7528\u6709\u5E8F\u5217\u8868\u63D0\u4F9B\u529F\u80FD\u4F7F\u7528\u6B65\u9AA4\uFF0C\u4FBF\u4E8E AI \u63D0\u53D6\u64CD\u4F5C\u6307\u5357"),i-=15),t.textContent.toLowerCase().includes("how to")||t.textContent.toLowerCase().includes("\u5982\u4F55")||t.textContent.toLowerCase().includes("\u6559\u7A0B")||t.schemaMarkup.some(o=>o["@type"]==="HowTo")||(e.push("\u7F3A\u5C11 How-to \u7C7B\u578B\u7684\u5185\u5BB9"),s.push("\u6DFB\u52A0 How-to \u6307\u5357\u5185\u5BB9\uFF0C\u5E76\u4F7F\u7528 HowTo Schema \u6807\u8BB0"),i-=15),t.wordCount<500&&(e.push(`\u5185\u5BB9\u4EC5 ${t.wordCount} \u8BCD\uFF0C\u529F\u80FD\u89E3\u91CA\u6DF1\u5EA6\u4E0D\u8DB3`),s.push("\u6269\u5C55\u529F\u80FD\u8BF4\u660E\u5185\u5BB9\uFF0C\u63D0\u4F9B\u4F7F\u7528\u573A\u666F\u548C\u8BE6\u7EC6\u89E3\u91CA"),i-=15),e.length===0&&s.push("\u529F\u80FD\u53EF\u89E3\u91CA\u6027\u826F\u597D");let p="",l=t.paragraphs.find(o=>o.length>50&&(o.toLowerCase().includes("feature")||o.toLowerCase().includes("\u529F\u80FD")||o.toLowerCase().includes("how to")||o.toLowerCase().includes("\u6B65\u9AA4")||/\d+[\.\)]\s/.test(o)));return l&&(p=l.length>120?l.substring(0,120)+"...":l),{name:"Feature Explainability",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:p||void 0}}function At(t){let e=[],s=[],i=100;t.faqContent.length===0?(e.push("\u9875\u9762\u7F3A\u5C11 FAQ \u95EE\u7B54\u5185\u5BB9"),s.push("\u6DFB\u52A0\u5E38\u89C1\u95EE\u9898\u89E3\u7B54\u6A21\u5757\uFF0C\u8986\u76D6\u7528\u6237\u53EF\u80FD\u641C\u7D22\u7684\u95EE\u9898"),i-=25):t.faqContent.length<3&&(e.push(`FAQ \u4EC5 ${t.faqContent.length} \u6761\uFF0C\u8986\u76D6\u9762\u4E0D\u8DB3`),s.push("\u589E\u52A0\u66F4\u591A FAQ \u6761\u76EE\uFF0C\u8986\u76D6\u4E0D\u540C\u7528\u6237\u610F\u56FE"),i-=10),t.headings.filter(l=>l.text.includes("?")||l.text.includes("\uFF1F")||l.text.includes("\u5982\u4F55")||l.text.includes("\u600E\u4E48")).length===0&&(e.push("\u6807\u9898\u4E2D\u7F3A\u5C11\u95EE\u9898\u5F62\u5F0F\u7684\u8868\u8FF0"),s.push("\u4F7F\u7528\u95EE\u53E5\u4F5C\u4E3A\u90E8\u5206\u7AE0\u8282\u6807\u9898\uFF0C\u5339\u914D\u7528\u6237\u7684\u641C\u7D22\u610F\u56FE"),i-=15),t.textContent.toLowerCase().includes("you might")||t.textContent.toLowerCase().includes("you can")||t.textContent.toLowerCase().includes("\u4F60\u53EF\u4EE5")||t.textContent.toLowerCase().includes("\u4F60\u53EF\u80FD")||(e.push("\u5185\u5BB9\u7F3A\u5C11\u5BF9\u8BDD\u5F0F\u8868\u8FF0"),s.push("\u4F7F\u7528\u66F4\u81EA\u7136\u7684\u5BF9\u8BDD\u5F0F\u8BED\u8A00\uFF0C\u5339\u914D AI \u5F15\u64CE\u7684\u95EE\u7B54\u6A21\u5F0F"),i-=10),e.length===0&&s.push("\u7528\u6237\u610F\u56FE\u8986\u76D6\u826F\u597D");let p="";if(t.faqContent.length>0){let l=t.faqContent[0];p=`${l.question} ${l.answer}`,p.length>120&&(p=p.substring(0,120)+"...")}else{let l=t.headings.find(o=>o.text.includes("?")||o.text.includes("\uFF1F")||o.text.includes("\u5982\u4F55"));l&&(p=l.text)}return{name:"User Intent / Q&A",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:p||void 0}}function St(t){let e=[],s=[],i=100,n=t.textContent.toLowerCase();n.includes("use case")||n.includes("\u7528\u4F8B")||n.includes("\u5E94\u7528\u573A\u666F")||n.includes("example")||n.includes("\u793A\u4F8B")||n.includes("scenario")||n.includes("\u573A\u666F")||(e.push("\u9875\u9762\u7F3A\u5C11\u660E\u786E\u7684\u4F7F\u7528\u573A\u666F/\u7528\u4F8B\u63CF\u8FF0"),s.push('\u6DFB\u52A0"\u4F7F\u7528\u573A\u666F"\u6216"\u5E94\u7528\u6848\u4F8B"\u7AE0\u8282\uFF0C\u63CF\u8FF0\u4EA7\u54C1\u7684\u5178\u578B\u4F7F\u7528\u65B9\u5F0F'),i-=30),t.lists.some(c=>c.toLowerCase().includes("example")||c.toLowerCase().includes("\u4F8B\u5982")||c.toLowerCase().includes("\u5982"))||n.includes("for instance")||n.includes("\u6BD4\u5982")||(e.push("\u7F3A\u5C11\u5177\u4F53\u7684\u5B9E\u4F8B\u8BF4\u660E"),s.push("\u4E3A\u5173\u952E\u529F\u80FD\u63D0\u4F9B\u5177\u4F53\u7684\u4F7F\u7528\u5B9E\u4F8B"),i-=15),n.includes("for ")||n.includes("\u9002\u5408")||n.includes("\u9762\u5411")||n.includes("target")||n.includes("\u884C\u4E1A")||(e.push("\u7F3A\u5C11\u76EE\u6807\u7528\u6237/\u884C\u4E1A\u5B9A\u4F4D\u63CF\u8FF0"),s.push("\u660E\u786E\u63CF\u8FF0\u4EA7\u54C1\u9002\u5408\u54EA\u4E9B\u7528\u6237\u7FA4\u4F53\u6216\u884C\u4E1A"),i-=15),e.length===0&&s.push("\u4F7F\u7528\u573A\u666F\u63CF\u8FF0\u5145\u5206");let o="",r=t.paragraphs.find(c=>c.toLowerCase().includes("use case")||c.toLowerCase().includes("\u573A\u666F")||c.toLowerCase().includes("example")||c.toLowerCase().includes("\u4F8B\u5982")||c.toLowerCase().includes("\u9002\u5408"));return r&&(o=r.length>120?r.substring(0,120)+"...":r),{name:"Use Cases",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:o||void 0}}function bt(t){let e=[],s=[],i=100,n=t.textContent.toLowerCase(),a=n.includes("vs")||n.includes("versus")||n.includes("\u5BF9\u6BD4")||n.includes("\u6BD4\u8F83")||n.includes("\u76F8\u6BD4")||n.includes("advantage")||n.includes("\u4F18\u52BF");a||(e.push("\u9875\u9762\u7F3A\u5C11\u5BF9\u6BD4/\u6BD4\u8F83\u5185\u5BB9"),s.push("\u6DFB\u52A0\u4E0E\u7ADE\u54C1\u6216\u66FF\u4EE3\u65B9\u6848\u7684\u5BF9\u6BD4\u5185\u5BB9\uFF0C\u5E2E\u52A9 AI \u5F15\u64CE\u7406\u89E3\u4EA7\u54C1\u5B9A\u4F4D"),i-=30),t.tables.length===0&&a&&(e.push("\u5BF9\u6BD4\u5185\u5BB9\u672A\u4F7F\u7528\u8868\u683C\u5448\u73B0"),s.push("\u4F7F\u7528\u8868\u683C\u5F62\u5F0F\u5448\u73B0\u5BF9\u6BD4\u4FE1\u606F\uFF0C\u4FBF\u4E8E AI \u63D0\u53D6\u7ED3\u6784\u5316\u6570\u636E"),i-=15),n.includes("unique")||n.includes("\u72EC\u7279")||n.includes("difference")||n.includes("\u533A\u522B")||n.includes("why choose")||n.includes("\u4E3A\u4EC0\u4E48\u9009\u62E9")||(e.push("\u7F3A\u5C11\u72EC\u7279\u5356\u70B9 (USP) \u7684\u660E\u786E\u8868\u8FF0"),s.push("\u660E\u786E\u9610\u8FF0\u4EA7\u54C1\u7684\u72EC\u7279\u4F18\u52BF\u548C\u5DEE\u5F02\u5316\u7279\u70B9"),i-=15),e.length===0&&s.push("\u5BF9\u6BD4\u4E0A\u4E0B\u6587\u5B8C\u5584");let l=Pt(t),o="",r=t.paragraphs.find(c=>c.toLowerCase().includes("vs")||c.toLowerCase().includes("\u5BF9\u6BD4")||c.toLowerCase().includes("\u6BD4\u8F83")||c.toLowerCase().includes("advantage")||c.toLowerCase().includes("\u4F18\u52BF"));return r&&(o=r.length>120?r.substring(0,120)+"...":r),{name:"Comparison Context",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:o||void 0,intentGaps:l}}function Pt(t){let e=[],s=t.textContent,i=s.toLowerCase(),n=t.title||"",a=n.replace(/[|\-–—_·].*$/,"").trim()||"\u672C\u4EA7\u54C1",p=[{keywords:/眼镜|镜腿|压迫/,prompt:null,topic:"\u7F3A\u5C11\u3010\u6234\u773C\u955C/\u773C\u955C\u817F\u5E72\u6D89\u3011\u573A\u666F\u7684\u9002\u914D\u8BF4\u660E",promptText:r=>`\u6234\u773C\u955C\u7684\u4EBA\u9002\u5408\u6234${r}\u5417\uFF1F\u4F1A\u4E0D\u4F1A\u5361\u5230\u773C\u955C\u817F\uFF1F`,suggestion:r=>"\u91C7\u7528\u907F\u5F00\u8033\u540E\u773C\u955C\u817F\u89E6\u70B9\u7684\u5F27\u5F62\u8BBE\u8BA1\uFF0C\u4F69\u6234\u65F6\u955C\u817F\u65E0\u989D\u5916\u538B\u8FEB\u611F\uFF0C\u6234\u773C\u955C\u7528\u6237\u53EF\u957F\u65F6\u95F4\u8212\u9002\u4F7F\u7528\u3002"},{keywords:/运动|跑步|健身|汗水|防水|防汗/,prompt:null,topic:"\u7F3A\u5C11\u3010\u8FD0\u52A8/\u6C57\u6C34\u573A\u666F\u3011\u7684\u9002\u7528\u6027\u8BF4\u660E",promptText:r=>`${r}\u9002\u5408\u8FD0\u52A8\u3001\u8DD1\u6B65\u65F6\u4F7F\u7528\u5417\uFF1F\u51FA\u6C57\u4F1A\u4E0D\u4F1A\u5F71\u54CD\uFF1F`,suggestion:r=>`${r}\u5177\u5907\u8FD0\u52A8\u573A\u666F\u9002\u914D\u80FD\u529B\uFF1A\u4F69\u6234\u7A33\u56FA\u4E0D\u6613\u8131\u843D\uFF0C\u9632\u6C57\u9632\u6CFC\u6E85\u8BBE\u8BA1\u6EE1\u8DB3\u8DD1\u6B65\u3001\u5065\u8EAB\u7B49\u573A\u666F\u9700\u6C42\u3002`},{keywords:/儿童|老人|学生|小头围|耳道|入门|新手/,prompt:null,topic:"\u7F3A\u5C11\u3010\u76EE\u6807\u4EBA\u7FA4/\u907F\u5751\u3011\u9002\u914D\u8BF4\u660E",promptText:r=>`${r}\u9002\u5408\u54EA\u4E9B\u4EBA\u7FA4\uFF1F\u8001\u4EBA\u5C0F\u5B69\u7528\u8D77\u6765\u65B9\u4FBF\u5417\uFF1F`,suggestion:r=>`${r}\u9002\u5408\u5173\u6CE8\u6838\u5FC3\u529F\u80FD\u3001\u8FFD\u6C42\u4FBF\u643A\u6613\u7528\u7684\u7528\u6237\uFF1A\u64CD\u4F5C\u7B80\u5355\u65E0\u9700\u590D\u6742\u8BBE\u7F6E\uFF0C\u521D\u6B21\u4F7F\u7528\u4E5F\u80FD\u5FEB\u901F\u4E0A\u624B\u3002`}];for(let r of p){if(e.length>=3)break;!r.keywords.test(s)&&!r.keywords.test(n)&&e.push({topic:r.topic,status:"missing",pageStatus:"\u626B\u63CF\u5168\u6587\uFF0C\u672A\u63D0\u53D6\u5230\u4E0E\u8BE5\u573A\u666F\u76F8\u5173\u7684\u4EFB\u4F55\u63CF\u8FF0\uFF0CAI \u65E0\u6CD5\u56DE\u7B54\u6B64\u7C7B\u4E70\u524D\u63D0\u95EE\u3002",userPrompt:r.promptText(a),suggestion:r.suggestion(a),suggestionLabel:"\u5728\u4EA7\u54C1\u63CF\u8FF0\u6A21\u5757\u65B0\u589E\u6BB5\u843D"})}return/vs\.?|versus|对比|相比|比较|升级|上一代|前代|区别|提升/.test(i)||t.tables.some(r=>/对比|比较|参数|spec|compare|vs/i.test(r))||e.push({topic:"\u7F3A\u5C11\u4E0E\u3010\u4E0A\u4E00\u4EE3/\u540C\u7EA7\u4EA7\u54C1\u3011\u7684\u53C2\u6570\u7ED3\u6784\u5316\u5BF9\u6BD4",status:"unstructured",pageStatus:'\u4EC5\u6709\u5355\u54C1\u5356\u70B9\u63CF\u8FF0\uFF0C\u672A\u63D0\u4F9B\u4E0E\u524D\u4EE3\u4EA7\u54C1\u6216\u4E3B\u6D41\u7ADE\u54C1\u7684\u5BF9\u6BD4\u903B\u8F91\uFF0CAI \u65E0\u6CD5\u751F\u6210"\u503C\u4E0D\u503C\u5F97\u5347\u7EA7"\u7C7B\u56DE\u7B54\u3002',userPrompt:`${a}\u548C\u4E0A\u4E00\u4EE3\u76F8\u6BD4\u63D0\u5347\u4E86\u4EC0\u4E48\uFF1F\u503C\u5F97\u5347\u7EA7\u5417\uFF1F`,suggestion:'\u5EFA\u8BAE\u65B0\u589E\u4E00\u4E2A 2\xD73 \u7684 HTML \u8868\u683C\uFF08\u5BF9\u6BD4\u6838\u5FC3\u53C2\u6570\uFF1A\u5982\u7EED\u822A\u3001\u82AF\u7247\u3001\u97F3\u8D28\u7B49\u7EA7\uFF09\uFF0C\u5E76\u5728\u8868\u683C\u4E0A\u65B9\u52A0\u4E0A H3 \u6807\u9898\uFF1A"\u4E0E\u4E0A\u4E00\u4EE3\u4EA7\u54C1\u5BF9\u6BD4\uFF1A\u6838\u5FC3\u63D0\u5347\u70B9"\uFF0C\u9010\u9879\u5217\u51FA\u6570\u503C\u53D8\u5316\uFF0C\u4FBF\u4E8E AI \u76F4\u63A5\u63D0\u53D6\u7ED3\u6784\u5316\u6570\u636E\u3002',suggestionLabel:"\u65B0\u589E\u5BF9\u6BD4\u8868\u683C + H3 \u6807\u9898"}),!(/替代|同类|同级|竞品|同价位| alternatives |recommend/i.test(i)||t.tables.length>0)&&e.length<3&&e.push({topic:"\u7F3A\u5C11\u3010\u540C\u4EF7\u4F4D/\u540C\u7C7B\u66FF\u4EE3\u54C1\u3011\u7684\u6A2A\u5411\u5BF9\u6BD4\u8BF4\u660E",status:"missing",pageStatus:'\u9875\u9762\u672A\u63D0\u53CA\u4EFB\u4F55\u540C\u7C7B\u66FF\u4EE3\u54C1\u6216\u540C\u4EF7\u4F4D\u6A2A\u8BC4\u4FE1\u606F\uFF0CAI \u5728"\u5B83\u548C Y \u6709\u4EC0\u4E48\u533A\u522B"\u7C7B\u63D0\u95EE\u65F6\u65E0\u6CD5\u5F15\u7528\u672C\u9875\u9762\u3002',userPrompt:`${a}\u548C\u540C\u4EF7\u4F4D\u5176\u4ED6\u4EA7\u54C1\u76F8\u6BD4\u6709\u4EC0\u4E48\u533A\u522B\uFF1F`,suggestion:'\u65B0\u589E\u6BB5\u843D"\u4E0E\u540C\u4EF7\u4F4D\u4EA7\u54C1\u5BF9\u6BD4"\uFF1A\u5217\u51FA 2-3 \u4E2A\u5177\u4F53\u5DEE\u5F02\u7EF4\u5EA6\uFF08\u5982\u4F69\u6234\u65B9\u5F0F\u3001\u7EED\u822A\u3001\u7279\u8272\u529F\u80FD\uFF09\uFF0C\u6BCF\u9879\u7ED9\u51FA\u672C\u4EA7\u54C1\u7684\u5177\u4F53\u6570\u503C\u6216\u80FD\u529B\uFF0C\u5E76\u8BF4\u660E\u9002\u5408\u54EA\u7C7B\u9700\u6C42\u7684\u7528\u6237\u9009\u62E9\u3002',suggestionLabel:"\u65B0\u589E\u6A2A\u5411\u5BF9\u6BD4\u6BB5\u843D"}),e.slice(0,3)}function It(t){let e=[],s=[],i=100,n=t.textContent.toLowerCase();n.includes("review")||n.includes("\u8BC4\u4EF7")||n.includes("testimonial")||n.includes("\u5BA2\u6237")||n.includes("customer")||n.includes("\u7528\u6237\u53CD\u9988")||(e.push("\u7F3A\u5C11\u793E\u4F1A\u8BC1\u660E\uFF08\u7528\u6237\u8BC4\u4EF7\u3001\u6848\u4F8B\u7814\u7A76\u7B49\uFF09"),s.push("\u6DFB\u52A0\u7528\u6237\u8BC4\u4EF7\u3001\u5BA2\u6237\u6848\u4F8B\u6216\u7B2C\u4E09\u65B9\u8BC4\u6D4B\u5F15\u7528"),i-=20),n.includes("research")||n.includes("\u7814\u7A76")||n.includes("study")||n.includes("report")||n.includes("\u62A5\u544A")||n.includes("official")||n.includes("\u5B98\u65B9")||(e.push("\u7F3A\u5C11\u6743\u5A01\u6027\u5F15\u7528\u6216\u6570\u636E\u6765\u6E90"),s.push("\u5F15\u7528\u6743\u5A01\u7814\u7A76\u3001\u884C\u4E1A\u62A5\u544A\u6216\u5B98\u65B9\u6570\u636E"),i-=15);let l=t.links.filter(u=>u.isExternal);!l.some(u=>u.href.includes(".gov")||u.href.includes(".edu")||u.href.includes("wikipedia")||u.href.includes("github"))&&l.length<2&&(e.push("\u7F3A\u5C11\u6307\u5411\u6743\u5A01\u6765\u6E90\u7684\u5916\u90E8\u94FE\u63A5"),s.push("\u5F15\u7528\u6743\u5A01\u5916\u90E8\u8D44\u6E90\uFF08\u5B98\u65B9\u6587\u6863\u3001\u7814\u7A76\u673A\u6784\u7B49\uFF09"),i-=15),n.includes("contact")||n.includes("\u8054\u7CFB")||n.includes("about")||n.includes("\u5173\u4E8E")||(e.push("\u7F3A\u5C11\u8054\u7CFB/\u5173\u4E8E\u4FE1\u606F"),s.push("\u6DFB\u52A0\u8054\u7CFB\u65B9\u5F0F\u548C\u5173\u4E8E\u4FE1\u606F\uFF0C\u589E\u5F3A\u7F51\u7AD9\u53EF\u4FE1\u5EA6"),i-=10),t.html.includes("privacy")||t.html.includes("\u9690\u79C1")||t.html.includes("terms")||t.html.includes("\u6761\u6B3E")||(e.push("\u7F3A\u5C11\u9690\u79C1\u653F\u7B56/\u670D\u52A1\u6761\u6B3E\u94FE\u63A5"),s.push("\u6DFB\u52A0\u9690\u79C1\u653F\u7B56\u548C\u670D\u52A1\u6761\u6B3E\u9875\u9762\u94FE\u63A5"),i-=10),e.length===0&&s.push("\u8BC1\u636E\u4E0E\u4FE1\u4EFB\u4FE1\u53F7\u5B8C\u5584");let g="",f=t.paragraphs.find(u=>u.toLowerCase().includes("review")||u.toLowerCase().includes("\u8BC4\u4EF7")||u.toLowerCase().includes("customer")||u.toLowerCase().includes("\u5BA2\u6237")||u.toLowerCase().includes("award")||u.toLowerCase().includes("\u8BA4\u8BC1"));return f&&(g=f.length>120?f.substring(0,120)+"...":f),{name:"Evidence & Trust",score:Math.max(0,i),issues:e,suggestions:s,contentSnippet:g||void 0}}function vt(t,e,s){let i=[],n=[],a=e.dimensions.find(h=>h.name==="Crawlability");a&&a.score<80&&(t.canonicalUrl||i.push({type:"add",title:"\u6DFB\u52A0 Canonical URL",description:"\u5728 <head> \u4E2D\u6DFB\u52A0 canonical \u6807\u7B7E\uFF0C\u907F\u514D\u91CD\u590D\u5185\u5BB9\u95EE\u9898",optimizedCode:`<head>
  <!-- \u6DFB\u52A0 canonical URL -->
  <link rel="canonical" href="${t.url}" />
</head>`,language:"html"}),t.lang||i.push({type:"fix",title:"\u6DFB\u52A0 HTML lang \u5C5E\u6027",description:"\u5728 html \u6807\u7B7E\u4E2D\u6DFB\u52A0\u8BED\u8A00\u5C5E\u6027",originalCode:"<html>",optimizedCode:'<html lang="zh-CN">',language:"html"}));let p=e.dimensions.find(h=>h.name==="Semantic Structure");if(p&&p.score<80){let h=[];/<main[\s>]/i.test(t.html)||h.push("main"),/<article[\s>]/i.test(t.html)||h.push("article"),/<section[\s>]/i.test(t.html)||h.push("section"),h.length>0&&i.push({type:"optimize",title:"\u4F7F\u7528\u8BED\u4E49\u5316 HTML5 \u6807\u7B7E",description:`\u6DFB\u52A0\u7F3A\u5931\u7684\u8BED\u4E49\u5316\u6807\u7B7E: ${h.join(", ")}`,optimizedCode:`<body>
  <header>
    <nav>...</nav>
  </header>
  <main>
    <article>
      <section>
        <h2>\u7AE0\u8282\u6807\u9898</h2>
        <p>\u5185\u5BB9\u6BB5\u843D...</p>
      </section>
    </article>
    <aside>
      <h3>\u76F8\u5173\u5185\u5BB9</h3>
    </aside>
  </main>
  <footer>...</footer>
</body>`,language:"html"})}let l=e.dimensions.find(h=>h.name==="Entity & Schema");l&&l.score<70&&(i.push({type:"add",title:"\u6DFB\u52A0 JSON-LD Schema \u6807\u8BB0",description:"\u6DFB\u52A0\u7ED3\u6784\u5316\u6570\u636E\u5E2E\u52A9 AI \u5F15\u64CE\u7406\u89E3\u9875\u9762\u5185\u5BB9",optimizedCode:`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${t.title||"\u9875\u9762\u6807\u9898"}",
  "description": "${t.metaDescription||"\u9875\u9762\u63CF\u8FF0"}",
  "url": "${t.url}",
  "publisher": {
    "@type": "Organization",
    "name": "\u7EC4\u7EC7\u540D\u79F0",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>`,language:"html"}),t.faqContent.length===0&&i.push({type:"add",title:"\u6DFB\u52A0 FAQ Schema",description:"\u5982\u679C\u9875\u9762\u6709\u95EE\u7B54\u5185\u5BB9\uFF0C\u4F7F\u7528 FAQPage Schema \u6807\u8BB0",optimizedCode:`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "\u4F60\u7684\u95EE\u9898\u662F\u4EC0\u4E48\uFF1F",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "\u8FD9\u91CC\u662F\u8BE6\u7EC6\u7684\u56DE\u7B54\u5185\u5BB9\u3002"
      }
    },
    {
      "@type": "Question",
      "name": "\u7B2C\u4E8C\u4E2A\u5E38\u89C1\u95EE\u9898\uFF1F",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "\u5BF9\u5E94\u7684\u56DE\u7B54\u5185\u5BB9\u3002"
      }
    }
  ]
}
</script>`,language:"html"}));let o=e.dimensions.find(h=>h.name==="Metadata & AI Signals");o&&o.score<80&&(t.metaDescription||i.push({type:"add",title:"\u6DFB\u52A0 Meta Description",description:"\u7F16\u5199\u7CBE\u51C6\u7684 meta description\uFF0C\u5305\u542B\u6838\u5FC3\u5173\u952E\u8BCD",optimizedCode:`<head>
  <meta name="description" content="\u5728\u8FD9\u91CC\u7F16\u5199150-160\u5B57\u7B26\u7684\u9875\u9762\u63CF\u8FF0\uFF0C\u5305\u542B\u6838\u5FC3\u5173\u952E\u8BCD\u548C\u4E3B\u8981\u4EF7\u503C\u4E3B\u5F20\uFF0C\u5438\u5F15\u7528\u6237\u70B9\u51FB\u3002" />
  
  <!-- Open Graph \u6807\u7B7E -->
  <meta property="og:title" content="${t.title||"\u9875\u9762\u6807\u9898"}" />
  <meta property="og:description" content="\u793E\u4EA4\u5206\u4EAB\u65F6\u7684\u63CF\u8FF0\u5185\u5BB9" />
  <meta property="og:image" content="https://example.com/og-image.jpg" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${t.url}" />
</head>`,language:"html"}),i.push({type:"add",title:"\u6DFB\u52A0\u9762\u5411 AI \u7684\u4F18\u5316\u6807\u7B7E",description:"\u6DFB\u52A0 llms.txt \u548C AI \u6458\u8981\u76F8\u5173\u7684 meta \u6807\u7B7E",optimizedCode:`<head>
  <!-- AI \u53CB\u597D\u7684\u5143\u6570\u636E -->
  <meta name="ai:purpose" content="\u63CF\u8FF0\u9875\u9762\u7684\u6838\u5FC3\u7528\u9014" />
  <meta name="ai:topic" content="\u9875\u9762\u7684\u4E3B\u8981\u4E3B\u9898" />
  <meta name="ai:audience" content="\u76EE\u6807\u53D7\u4F17\u63CF\u8FF0" />
  
  <!-- \u94FE\u63A5\u5230 llms.txt -->
  <link rel="llms" href="/llms.txt" />
</head>`,language:"html"}));let r=e.dimensions.find(h=>h.name==="Content Accessibility");if(r&&r.score<80){let h=t.images.filter(y=>!y.alt);h.length>0&&i.push({type:"fix",title:"\u4E3A\u56FE\u7247\u6DFB\u52A0 alt \u5C5E\u6027",description:`${h.length} \u5F20\u56FE\u7247\u7F3A\u5C11 alt \u5C5E\u6027`,originalCode:h.slice(0,2).map(y=>`<img src="${y.src}" />`).join(`
`),optimizedCode:h.slice(0,2).map(y=>`<img src="${y.src}" alt="\u63CF\u8FF0\u56FE\u7247\u5185\u5BB9\u7684\u6587\u5B57" />`).join(`
`),language:"html"})}let c=s.dimensions.find(h=>h.name==="Product Facts");c&&c.score<70&&n.push({type:"add",title:"\u6DFB\u52A0\u4EA7\u54C1\u89C4\u683C\u8868\u683C",description:"\u4F7F\u7528 HTML \u8868\u683C\u5448\u73B0\u4EA7\u54C1\u89C4\u683C\uFF0C\u4FBF\u4E8E AI \u63D0\u53D6\u7ED3\u6784\u5316\u6570\u636E",optimizedCode:`<section>
  <h2>\u4EA7\u54C1\u89C4\u683C</h2>
  <table>
    <thead>
      <tr>
        <th>\u53C2\u6570</th>
        <th>\u89C4\u683C</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>\u6838\u5FC3\u53C2\u65701</td>
        <td>\u5177\u4F53\u6570\u503C</td>
      </tr>
      <tr>
        <td>\u6838\u5FC3\u53C2\u65702</td>
        <td>\u5177\u4F53\u6570\u503C</td>
      </tr>
    </tbody>
  </table>
</section>`,language:"html"});let g=s.dimensions.find(h=>h.name==="Feature Explainability");g&&g.score<70&&n.push({type:"add",title:"\u6DFB\u52A0 How-to \u7ED3\u6784\u5316\u5185\u5BB9",description:"\u4F7F\u7528\u6709\u5E8F\u5217\u8868\u548C HowTo Schema \u63D0\u4F9B\u529F\u80FD\u4F7F\u7528\u6307\u5357",optimizedCode:`<article>
  <h2>\u5982\u4F55\u4F7F\u7528 [\u4EA7\u54C1\u540D]</h2>
  <ol>
    <li>
      <h3>\u7B2C\u4E00\u6B65\uFF1A\u51C6\u5907\u5DE5\u4F5C</h3>
      <p>\u8BE6\u7EC6\u8BF4\u660E\u51C6\u5907\u5DE5\u4F5C...</p>
    </li>
    <li>
      <h3>\u7B2C\u4E8C\u6B65\uFF1A\u6838\u5FC3\u64CD\u4F5C</h3>
      <p>\u8BE6\u7EC6\u8BF4\u660E\u64CD\u4F5C\u6B65\u9AA4...</p>
    </li>
    <li>
      <h3>\u7B2C\u4E09\u6B65\uFF1A\u9A8C\u8BC1\u7ED3\u679C</h3>
      <p>\u8BE6\u7EC6\u8BF4\u660E\u9A8C\u8BC1\u65B9\u6CD5...</p>
    </li>
  </ol>
</article>

<!-- HowTo Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "\u5982\u4F55\u4F7F\u7528[\u4EA7\u54C1\u540D]",
  "step": [
    {
      "@type": "HowToStep",
      "name": "\u51C6\u5907\u5DE5\u4F5C",
      "text": "\u8BE6\u7EC6\u8BF4\u660E..."
    }
  ]
}
</script>`,language:"html"});let f=s.dimensions.find(h=>h.name==="User Intent / Q&A");f&&f.score<70&&n.push({type:"add",title:"\u6DFB\u52A0 FAQ \u95EE\u7B54\u6A21\u5757",description:"\u6DFB\u52A0\u5E38\u89C1\u95EE\u9898\u89E3\u7B54\uFF0C\u8986\u76D6\u7528\u6237\u641C\u7D22\u610F\u56FE",optimizedCode:`<section>
  <h2>\u5E38\u89C1\u95EE\u9898</h2>
  
  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">\u4EC0\u4E48\u662F[\u4EA7\u54C1\u540D]\uFF1F</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        [\u4EA7\u54C1\u540D]\u662F\u4E00\u6B3E...\uFF0C\u5B83\u53EF\u4EE5\u5E2E\u52A9\u7528\u6237...
      </p>
    </div>
  </div>

  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">\u5982\u4F55\u4F7F\u7528[\u4EA7\u54C1\u540D]\uFF1F</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        \u4F7F\u7528[\u4EA7\u54C1\u540D]\u975E\u5E38\u7B80\u5355\uFF0C\u53EA\u9700\u4E09\u6B65...
      </p>
    </div>
  </div>

  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">[\u4EA7\u54C1\u540D]\u7684\u4EF7\u683C\u662F\u591A\u5C11\uFF1F</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        [\u4EA7\u54C1\u540D]\u63D0\u4F9B\u591A\u79CD\u5B9A\u4EF7\u65B9\u6848...
      </p>
    </div>
  </div>
</section>`,language:"html"});let u=s.dimensions.find(h=>h.name==="Use Cases");u&&u.score<70&&n.push({type:"add",title:"\u6DFB\u52A0\u4F7F\u7528\u573A\u666F\u7AE0\u8282",description:"\u63CF\u8FF0\u4EA7\u54C1\u7684\u5178\u578B\u4F7F\u7528\u573A\u666F\u548C\u76EE\u6807\u7528\u6237",optimizedCode:`<section>
  <h2>\u5E94\u7528\u573A\u666F</h2>
  
  <div>
    <h3>\u573A\u666F\u4E00\uFF1A[\u573A\u666F\u540D\u79F0]</h3>
    <p><strong>\u9002\u7528\u4EBA\u7FA4\uFF1A</strong>[\u63CF\u8FF0\u76EE\u6807\u7528\u6237]</p>
    <p><strong>\u75DB\u70B9\uFF1A</strong>[\u7528\u6237\u9762\u4E34\u7684\u95EE\u9898]</p>
    <p><strong>\u89E3\u51B3\u65B9\u6848\uFF1A</strong>[\u4EA7\u54C1\u5982\u4F55\u89E3\u51B3]</p>
    <p><strong>\u6548\u679C\uFF1A</strong>[\u91CF\u5316\u7ED3\u679C]</p>
  </div>

  <div>
    <h3>\u573A\u666F\u4E8C\uFF1A[\u573A\u666F\u540D\u79F0]</h3>
    <p><strong>\u9002\u7528\u4EBA\u7FA4\uFF1A</strong>[\u63CF\u8FF0\u76EE\u6807\u7528\u6237]</p>
    <p><strong>\u75DB\u70B9\uFF1A</strong>[\u7528\u6237\u9762\u4E34\u7684\u95EE\u9898]</p>
    <p><strong>\u89E3\u51B3\u65B9\u6848\uFF1A</strong>[\u4EA7\u54C1\u5982\u4F55\u89E3\u51B3]</p>
    <p><strong>\u6548\u679C\uFF1A</strong>[\u91CF\u5316\u7ED3\u679C]</p>
  </div>
</section>`,language:"html"});let d=s.dimensions.find(h=>h.name==="Comparison Context");d&&d.score<70&&n.push({type:"add",title:"\u6DFB\u52A0\u4EA7\u54C1\u5BF9\u6BD4\u8868\u683C",description:"\u4F7F\u7528\u8868\u683C\u6E05\u6670\u5448\u73B0\u4E0E\u7ADE\u54C1\u7684\u5BF9\u6BD4",optimizedCode:`<section>
  <h2>\u4EA7\u54C1\u5BF9\u6BD4</h2>
  <table>
    <thead>
      <tr>
        <th>\u529F\u80FD\u7279\u6027</th>
        <th>[\u4EA7\u54C1\u540D]</th>
        <th>\u7ADE\u54C1A</th>
        <th>\u7ADE\u54C1B</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>\u6838\u5FC3\u529F\u80FD1</td>
        <td>\u2705 \u652F\u6301</td>
        <td>\u274C \u4E0D\u652F\u6301</td>
        <td>\u26A0\uFE0F \u90E8\u5206\u652F\u6301</td>
      </tr>
      <tr>
        <td>\u6838\u5FC3\u529F\u80FD2</td>
        <td>\u2705 \u652F\u6301</td>
        <td>\u2705 \u652F\u6301</td>
        <td>\u274C \u4E0D\u652F\u6301</td>
      </tr>
      <tr>
        <td>\u4EF7\u683C</td>
        <td>\xA5XX/\u6708</td>
        <td>\xA5XX/\u6708</td>
        <td>\xA5XX/\u6708</td>
      </tr>
    </tbody>
  </table>
  
  <h3>\u4E3A\u4EC0\u4E48\u9009\u62E9[\u4EA7\u54C1\u540D]\uFF1F</h3>
  <ul>
    <li><strong>\u72EC\u7279\u4F18\u52BF1\uFF1A</strong>\u8BE6\u7EC6\u8BF4\u660E...</li>
    <li><strong>\u72EC\u7279\u4F18\u52BF2\uFF1A</strong>\u8BE6\u7EC6\u8BF4\u660E...</li>
  </ul>
</section>`,language:"html"});let x=s.dimensions.find(h=>h.name==="Evidence & Trust");return x&&x.score<70&&n.push({type:"add",title:"\u6DFB\u52A0\u4FE1\u4EFB\u4FE1\u53F7\u6A21\u5757",description:"\u589E\u52A0\u7528\u6237\u8BC4\u4EF7\u3001\u6743\u5A01\u5F15\u7528\u7B49\u4FE1\u4EFB\u4FE1\u53F7",optimizedCode:`<section>
  <h2>\u5BA2\u6237\u8BC4\u4EF7</h2>
  <div itemscope itemtype="https://schema.org/Review">
    <blockquote>
      <p itemprop="reviewBody">"\u4F7F\u7528[\u4EA7\u54C1\u540D]\u540E\uFF0C\u6211\u4EEC\u7684\u6548\u7387\u63D0\u5347\u4E86XX%..."</p>
    </blockquote>
    <cite itemprop="author">\u2014 \u7528\u6237\u540D, \u516C\u53F8\u540D</cite>
    <div itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
      <meta itemprop="ratingValue" content="5" />
    </div>
  </div>
</section>

<section>
  <h2>\u6570\u636E\u4E0E\u8BA4\u8BC1</h2>
  <ul>
    <li>\u{1F4CA} \u6765\u81EA[\u6743\u5A01\u673A\u6784]\u7684\u7814\u7A76\u663E\u793A...</li>
    <li>\u{1F3C6} \u83B7\u5F97[\u884C\u4E1A\u8BA4\u8BC1/\u5956\u9879]</li>
    <li>\u{1F4C8} \u5DF2\u6709 XX+ \u4F01\u4E1A\u5BA2\u6237\u4FE1\u8D56\u4F7F\u7528</li>
  </ul>
</section>`,language:"html"}),{technical:i,content:n}}function z(t,e){let s=e||t.url,i=[gt(t),dt(t),mt(t),ft(t),xt(t),yt(t)],n=Math.round(i.reduce((c,g)=>c+g.score,0)/i.length),a=[wt(t),Ct(t),At(t),St(t),bt(t),It(t)],p=Math.round(a.reduce((c,g)=>c+g.score,0)/a.length),l={dimensions:i,overallScore:n,suggestions:[]},o={dimensions:a,overallScore:p,suggestions:[]},r=vt(t,l,o);return l.suggestions=r.technical,o.suggestions=r.content,{url:s,title:t.title||s,technicalGEO:l,contentGEO:o,analyzedAt:new Date().toISOString()}}var zt=300*1e3;var Lt=globalThis;Lt.GeoAnalyzer={parseHTML:T,analyzeParsedPage:z,analyzeHTMLCode:$,generateFaqSchema:k,isMeaninglessAlt:A};return lt(Mt);})();
