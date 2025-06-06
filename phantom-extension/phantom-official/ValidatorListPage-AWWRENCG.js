import{a as U}from"./chunk-S65Y5EPT.js";import{c as I,g as V,l as b,n as F,o as W}from"./chunk-QQL7KG33.js";import"./chunk-PTJHYG2U.js";import"./chunk-CEZMY2VY.js";import{a as p,b as f,e as z}from"./chunk-TRAXC57E.js";import"./chunk-SCZD5JNT.js";import{a as L,b as P}from"./chunk-HRPW7DWY.js";import{a as H}from"./chunk-FFNPQTO5.js";import{b as S}from"./chunk-3KWWVBRC.js";import"./chunk-QGYMCRC7.js";import"./chunk-WZIUK5ED.js";import{g as k}from"./chunk-KXXMDE73.js";import{f as T}from"./chunk-TN4WWJWX.js";import"./chunk-4CYOLQKB.js";import{a as x}from"./chunk-M2JZP6J5.js";import"./chunk-77BBM4YY.js";import"./chunk-QWMCWRVK.js";import"./chunk-BYWSHP5V.js";import"./chunk-HETLV2MV.js";import"./chunk-LP7JNY3B.js";import"./chunk-4Z7SMQUN.js";import{c as w}from"./chunk-K5HHPSTF.js";import{ib as l,p as i}from"./chunk-6C52MCLT.js";import"./chunk-55Q6ZFSF.js";import"./chunk-XEI5RGHZ.js";import"./chunk-GZVOHEMO.js";import"./chunk-TMK4CY5E.js";import"./chunk-BR4JE5OD.js";import"./chunk-BRFTXGI6.js";import"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-U6X5ZLHM.js";import"./chunk-7X5IGQSF.js";import{ac as A}from"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{Da as v,H as d,L as C,x as s}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import{Y as y,t as h}from"./chunk-YTFWYDJ6.js";import{a as O}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-UNDMYLJW.js";import{f as j,h as u,n as g}from"./chunk-3KENBVE7.js";u();g();var t=j(O());var G=o=>{let{t:e}=s(),{searchResults:r,isLoading:n,hasError:a,isSuccess:m,showApy:D,onRefetch:B,setSearchTerm:M}=H(),c=(0,t.useRef)();return(0,t.useEffect)(()=>{setTimeout(()=>c.current?.focus(),200)},[]),t.default.createElement(W,{isLoading:n},a?t.default.createElement(I,{title:e("errorAndOfflineSomethingWentWrong"),description:e("validatorListErrorFetching"),refetch:B}):t.default.createElement(Q,null,t.default.createElement(X,null,t.default.createElement(k,{ref:c,tabIndex:0,placeholder:e("commandSearch"),onChange:_=>M(_.currentTarget.value),maxLength:50})),m&&r.length?t.default.createElement(q,{data:r,showApy:D}):t.default.createElement(K,null)),t.default.createElement(x,null,t.default.createElement(w,{onClick:o.onClose},e("commandCancel"))))},Lt=G,K=()=>{let{t:o}=s();return t.default.createElement(C,{padding:"screen"},t.default.createElement(l,{size:16,color:d.colors.legacy.textSecondary},o("validatorListNoResults")))},N=84,q=o=>{let{data:e,showApy:r}=o;return t.default.createElement(t.default.Fragment,null,t.default.createElement(Z,{showApy:r}),t.default.createElement(b,null,t.default.createElement(v,null,({height:n,width:a})=>t.default.createElement(V,{height:n,itemCount:e.length,itemData:e,itemSize:N,width:a},J))))},J=({index:o,style:e,data:r})=>{let n=r[o];return t.default.createElement("div",{key:n.identityPubkey,style:e},t.default.createElement($,{voteAccountPubkey:n.voteAccountPubkey,formattedPercentValue:n.totalApy?y(n.totalApy/100,{format:"0.00%"}):"",activatedStake:n.activatedStake,name:n.info?.name,keybaseUsername:n.info?.keybaseUsername,iconUrl:n.info?.iconUrl}))},Q=i.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`,X=i.div`
  position: relative;
`,Y=i.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
`,E=i(z).attrs(()=>({iconSize:12,lineHeight:19,fontWeight:500,fontSize:16}))``,Z=({showApy:o})=>{let{t:e}=s();return t.default.createElement(Y,null,t.default.createElement(E,{tooltipAlignment:"bottomLeft",info:t.default.createElement(f,null,t.default.createElement(p,null,e("validatorInfoDescription")))},e("validatorInfoTooltip")),o?t.default.createElement(E,{tooltipAlignment:"bottomRight",info:t.default.createElement(f,null,t.default.createElement(p,null,e("validatorApyInfoDescription")))},e("validatorApyInfoTooltip")):null)},$=o=>{let{pushDetailView:e,popDetailView:r}=T(),n=(0,t.useRef)(null),{data:a}=S(o.keybaseUsername),m=o.name??o.keybaseUsername??A(o.voteAccountPubkey);return t.default.createElement(R,{ref:n,onClick:()=>{e(t.default.createElement(U,{voteAccountPubkey:o.voteAccountPubkey,onClose:r}))}},t.default.createElement(tt,{iconUrl:o.iconUrl??a}),t.default.createElement(ot,null,t.default.createElement(et,null,t.default.createElement(l,{size:16,weight:600,lineHeight:19,textAlign:"left",noWrap:!0},h(m,20)),t.default.createElement(l,{size:14,color:d.colors.legacy.textSecondary,lineHeight:19,textAlign:"left",noWrap:!0},t.default.createElement(P,{format:"0,0"},o.activatedStake))),t.default.createElement(l,{size:14,weight:400,lineHeight:19,textAlign:"left",noWrap:!0},o.formattedPercentValue)))},R=i(F)`
  display: grid;
  grid-template-columns: 44px auto;
  column-gap: 10px;
`,tt=i(L).attrs({width:44})``,ot=i.div`
  overflow: hidden;
  width: 100%;
  display: flex;
  justify-content: space-between;
`,et=i.div`
  display: flex;
  flex-direction: column;
`;export{G as ValidatorListPage,Lt as default};
//# sourceMappingURL=ValidatorListPage-AWWRENCG.js.map
