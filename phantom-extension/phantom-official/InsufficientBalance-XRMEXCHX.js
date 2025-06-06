import{a as s,c as f}from"./chunk-H75QXKF2.js";import{a as T}from"./chunk-SWWYIJEC.js";import{Pa as b,X as I}from"./chunk-Q7EFTJLZ.js";import"./chunk-QQL7KG33.js";import"./chunk-MDZMKEZM.js";import"./chunk-PTJHYG2U.js";import"./chunk-P4ZL5KWS.js";import"./chunk-CEZMY2VY.js";import"./chunk-TRAXC57E.js";import"./chunk-252ILOVK.js";import"./chunk-IV2YAN4G.js";import"./chunk-SCZD5JNT.js";import"./chunk-HRPW7DWY.js";import"./chunk-FFNPQTO5.js";import"./chunk-3KWWVBRC.js";import"./chunk-PSYLTVFG.js";import"./chunk-QGYMCRC7.js";import"./chunk-UNPIHQLD.js";import"./chunk-FXCMZB3P.js";import"./chunk-WZIUK5ED.js";import"./chunk-KXXMDE73.js";import"./chunk-TN4WWJWX.js";import"./chunk-4CYOLQKB.js";import"./chunk-M2JZP6J5.js";import"./chunk-6R5SHFYO.js";import"./chunk-77BBM4YY.js";import"./chunk-QWMCWRVK.js";import"./chunk-RP4HT6XN.js";import"./chunk-BYWSHP5V.js";import"./chunk-JJOKJNIW.js";import"./chunk-HETLV2MV.js";import"./chunk-LP7JNY3B.js";import"./chunk-4Z7SMQUN.js";import"./chunk-AUAJXQXU.js";import{c as C,d as h}from"./chunk-K5HHPSTF.js";import{ib as l,p as o}from"./chunk-6C52MCLT.js";import"./chunk-OERJXOXU.js";import"./chunk-UCBZOSRF.js";import"./chunk-IKQYPAXW.js";import"./chunk-PFNJNBM2.js";import"./chunk-55Q6ZFSF.js";import"./chunk-XEI5RGHZ.js";import"./chunk-GZVOHEMO.js";import"./chunk-TMK4CY5E.js";import"./chunk-QPRXGMQJ.js";import"./chunk-BR4JE5OD.js";import"./chunk-BRFTXGI6.js";import"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-U6X5ZLHM.js";import"./chunk-7X5IGQSF.js";import{Za as c,fb as y,ub as x}from"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{H as a,L as B,x as g}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import"./chunk-YTFWYDJ6.js";import{a as M}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-O2N6PUOM.js";import"./chunk-UNDMYLJW.js";import{f as v,h as u,n as d}from"./chunk-3KENBVE7.js";u();d();var n=v(M());var P=o.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: scroll;
`,D=o.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 90px;
`,S=o(l).attrs({size:28,weight:500,color:a.colors.legacy.textPrimary})`
  margin: 16px;
`,V=o(l).attrs({size:14,weight:400,lineHeight:17,color:a.colors.legacy.textSecondary})`
  max-width: 275px;

  span {
    color: white;
  }
`,$=({networkId:t,token:r})=>{let{t:i}=g(),{handleHideModalVisibility:m}=b(),p=(0,n.useCallback)(()=>{m("insufficientBalance")},[m]),w=t&&y(x(c.getChainID(t))),{canBuy:k,openBuy:F}=I({caip19:w||"",context:"modal",analyticsEvent:"fiatOnrampFromInsufficientBalance"}),e=t?c.getTokenSymbol(t):i("tokens");return n.default.createElement(P,null,n.default.createElement("div",null,n.default.createElement(D,null,n.default.createElement(T,{type:"failure",backgroundWidth:75}),n.default.createElement(S,null,i("insufficientBalancePrimaryText",{tokenSymbol:e})),n.default.createElement(V,null,i("insufficientBalanceSecondaryText",{tokenSymbol:e})),r?n.default.createElement(B,{borderRadius:8,gap:1,marginTop:32,width:"100%"},n.default.createElement(s,{label:i("insufficientBalanceRemaining")},n.default.createElement(f,{color:a.colors.legacy.accentAlert},`${r.balance} ${e}`)),n.default.createElement(s,{label:i("insufficientBalanceRequired")},n.default.createElement(f,null,`${r.required} ${e}`))):null)),k?n.default.createElement(h,{primaryText:i("buyAssetInterpolated",{tokenSymbol:e}),onPrimaryClicked:F,secondaryText:i("commandCancel"),onSecondaryClicked:p}):n.default.createElement(C,{onClick:p},i("commandCancel")))},L=$;export{$ as InsufficientBalance,L as default};
//# sourceMappingURL=InsufficientBalance-XRMEXCHX.js.map
