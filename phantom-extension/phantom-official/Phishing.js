import{a as C}from"./chunk-BYWSHP5V.js";import{a as N}from"./chunk-J65DHMKH.js";import"./chunk-JJOKJNIW.js";import{a as P}from"./chunk-HETLV2MV.js";import"./chunk-LP7JNY3B.js";import"./chunk-4Z7SMQUN.js";import{a as U}from"./chunk-AUAJXQXU.js";import"./chunk-K5HHPSTF.js";import{d as T,ib as l,m as v,p as a,t as I}from"./chunk-6C52MCLT.js";import{a as z}from"./chunk-VQ6GV3BZ.js";import{c as L}from"./chunk-F7U3E3H6.js";import{V as w,Y as y}from"./chunk-OERJXOXU.js";import"./chunk-UCBZOSRF.js";import"./chunk-IKQYPAXW.js";import"./chunk-PFNJNBM2.js";import"./chunk-55Q6ZFSF.js";import"./chunk-XEI5RGHZ.js";import"./chunk-GZVOHEMO.js";import"./chunk-TMK4CY5E.js";import"./chunk-QPRXGMQJ.js";import"./chunk-BR4JE5OD.js";import{a as B}from"./chunk-BRFTXGI6.js";import{a as W}from"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-U6X5ZLHM.js";import"./chunk-7X5IGQSF.js";import"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{H as p,x}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import{x as S}from"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import"./chunk-YTFWYDJ6.js";import{a as k}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-O2N6PUOM.js";import"./chunk-UNDMYLJW.js";import{f as c,h as n,n as s}from"./chunk-3KENBVE7.js";n();s();var O=c(k());var J=c(z());n();s();var e=c(k());n();s();var r=c(k());var m=p.colors.legacy.accentAlert,A=a.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: ${p.colors.brand.white};
  padding: clamp(24px, 16vh, 256px) 24px;
  box-sizing: border-box;
`,K=a.div`
  margin-bottom: 24px;
  padding-bottom: 8vh;
`,G=a.div`
  max-width: 100ch;
  margin: auto;

  * {
    text-align: left;
  }
`,F=a.a`
  text-decoration: underline;
  color: ${m};
`,d=new B,_=({origin:o,subdomain:t})=>{let{t:g}=x(),f=o?y(o):"",M=o??"",u=new URL(M).hostname,h=t==="true"?u:f,$=async()=>{if(t==="true"){let b=await d.get("userWhitelistedSubdomains"),i=JSON.parse(`${b}`);i?i.push(u):i=[u],i=[...new Set(i)],d.set("userWhitelistedSubdomains",JSON.stringify(i))}else{let b=await d.get("userWhitelistedOrigins"),i=JSON.parse(`${b}`);i?i.push(f):i=[f],i=[...new Set(i)],d.set("userWhitelistedOrigins",JSON.stringify(i))}self.location.href=o};return r.default.createElement(A,null,r.default.createElement(G,null,r.default.createElement(K,null,r.default.createElement(I,{width:128,fill:p.colors.brand.white})),r.default.createElement(l,{size:30,color:m,weight:"600"},g("blocklistOriginDomainIsBlocked",{domainName:h||g("blocklistOriginThisDomain")})),r.default.createElement(l,{color:m},g("blocklistOriginSiteIsMalicious")),r.default.createElement(l,{color:m},r.default.createElement(C,{i18nKey:"blocklistOriginCommunityDatabaseInterpolated"},"This site has been flagged as part of a",r.default.createElement(F,{href:w,rel:"noopener",target:"_blank"},"community-maintained database"),"of known phishing websites and scams. If you believe the site has been flagged in error,",r.default.createElement(F,{href:w,rel:"noopener",target:"_blank"},"please file an issue"),".")),h?r.default.createElement(l,{color:m,onClick:$,hoverUnderline:!0},g("blocklistOriginIgnoreWarning",{domainName:o})):r.default.createElement(r.default.Fragment,null)))};var H=()=>{let o;try{o=new URLSearchParams(self.location.search).get("origin")||"",new URL(o)}catch{o=""}return o},j=()=>new URLSearchParams(self.location.search).get("subdomain")||"",E=()=>{let o=(0,e.useMemo)(H,[]),t=(0,e.useMemo)(j,[]);return e.default.createElement(T,{future:{v7_startTransition:!0}},e.default.createElement(P,null,e.default.createElement(_,{origin:o,subdomain:t})))};W();S.init({provider:N});L("frontend");var q=document.getElementById("root"),Q=(0,J.createRoot)(q);Q.render(O.default.createElement(v,{theme:U},O.default.createElement(E,null)));
//# sourceMappingURL=Phishing.js.map
