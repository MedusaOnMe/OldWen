import{a as V,c as A}from"./chunk-N4RSOYKC.js";import{a as O}from"./chunk-JABDXU4V.js";import{c as F}from"./chunk-K5HHPSTF.js";import{Da as I,Ea as g,Fa as p,Ga as S,Ha as f,Ia as x,Ja as k,Ka as y,La as w,Ma as L,Na as T,Oa as v,Pa as C,Qa as P,Ra as M,Sa as b,Ta as D,Ua as a,Va as W,ib as G,p as o}from"./chunk-6C52MCLT.js";import{c as d}from"./chunk-BRFTXGI6.js";import"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-7X5IGQSF.js";import"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{H as u,e as l}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import"./chunk-YTFWYDJ6.js";import{a as h}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-UNDMYLJW.js";import{f as m,h as i,n as c}from"./chunk-3KENBVE7.js";i();c();var t=m(h());i();c();var B=m(h());var E={[O]:a,vote:w,"vote-2":L,stake:T,"stake-2":v,view:C,chat:P,tip:M,mint:b,"mint-2":D,"generic-link":a,"generic-add":W,discord:I,twitter:g,"twitter-2":p,x:p,instagram:S,telegram:f,leaderboard:y,gaming:x,"gaming-2":k};function N({icon:s,...n}){let r=E[s];return B.default.createElement(r,{...n})}var H=o.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: -16px; // compensate for generic screen margins
`,Y=o.footer`
  margin-top: auto;
  flex-shrink: 0;
  min-height: 16px;
`,_=o.div`
  overflow: scroll;
`,j=o.ul`
  flex: 1;
  max-height: 350px;
  padding-top: 16px; // compensate for the override of the generic screen margins
`,q=o.li``,J=o.div`
  display: flex;
  align-items: center;
  padding: 6px 12px;
`,U=o(G)`
  text-align: left;
`;U.defaultProps={margin:"12px 0px"};function K({shortcuts:s,...n}){let r=(0,t.useMemo)(()=>n.hostname.includes("//")?new URL(n.hostname).hostname:n.hostname,[n.hostname]);return t.default.createElement(H,null,t.default.createElement(_,null,t.default.createElement(j,null,s.map(e=>t.default.createElement(q,{key:e.uri},t.default.createElement(F,{type:"button",onClick:()=>{d.capture("walletShortcutsLinkOpenClick",V(n,e)),self.open(e.uri)},theme:"text",paddingY:6},t.default.createElement(J,null,t.default.createElement(N,{icon:A(e.uri,e.icon)})),e.label))))),t.default.createElement(Y,null,r&&t.default.createElement(U,{color:u.colors.legacy.textSecondary,size:14,lineHeight:17},l("shortcutsWarningDescription",{url:r}))))}var pt=K;export{K as ShortcutsModal,pt as default};
//# sourceMappingURL=ShortcutsModal-Y7VNJA5X.js.map
