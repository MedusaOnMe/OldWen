import{Pa as g}from"./chunk-Q7EFTJLZ.js";import"./chunk-QQL7KG33.js";import"./chunk-MDZMKEZM.js";import"./chunk-PTJHYG2U.js";import"./chunk-P4ZL5KWS.js";import"./chunk-CEZMY2VY.js";import"./chunk-TRAXC57E.js";import"./chunk-252ILOVK.js";import"./chunk-IV2YAN4G.js";import"./chunk-SCZD5JNT.js";import"./chunk-HRPW7DWY.js";import"./chunk-FFNPQTO5.js";import"./chunk-3KWWVBRC.js";import"./chunk-PSYLTVFG.js";import"./chunk-QGYMCRC7.js";import"./chunk-UNPIHQLD.js";import"./chunk-FXCMZB3P.js";import"./chunk-WZIUK5ED.js";import"./chunk-KXXMDE73.js";import"./chunk-TN4WWJWX.js";import"./chunk-4CYOLQKB.js";import"./chunk-M2JZP6J5.js";import"./chunk-6R5SHFYO.js";import"./chunk-77BBM4YY.js";import"./chunk-QWMCWRVK.js";import"./chunk-RP4HT6XN.js";import{a as w}from"./chunk-BYWSHP5V.js";import"./chunk-JJOKJNIW.js";import"./chunk-HETLV2MV.js";import"./chunk-LP7JNY3B.js";import"./chunk-4Z7SMQUN.js";import"./chunk-AUAJXQXU.js";import{d as T}from"./chunk-K5HHPSTF.js";import{ib as a,ja as u,p as o}from"./chunk-6C52MCLT.js";import{Ab as y,bb as S}from"./chunk-OERJXOXU.js";import"./chunk-UCBZOSRF.js";import"./chunk-IKQYPAXW.js";import"./chunk-PFNJNBM2.js";import"./chunk-55Q6ZFSF.js";import"./chunk-XEI5RGHZ.js";import"./chunk-GZVOHEMO.js";import"./chunk-TMK4CY5E.js";import"./chunk-QPRXGMQJ.js";import"./chunk-BR4JE5OD.js";import"./chunk-BRFTXGI6.js";import"./chunk-R4TGE3F2.js";import"./chunk-HYOCMEEG.js";import"./chunk-U6X5ZLHM.js";import"./chunk-7X5IGQSF.js";import"./chunk-M4V43KDP.js";import"./chunk-7LN3AER5.js";import"./chunk-46FGAK6J.js";import{H as i,x as f}from"./chunk-HG4P4WCJ.js";import"./chunk-Q24656HF.js";import"./chunk-7KFKYD5L.js";import"./chunk-VU23O6LP.js";import"./chunk-RFTHTXRF.js";import"./chunk-YTFWYDJ6.js";import{X as p,Y as d,a as x}from"./chunk-O2FNG2JZ.js";import"./chunk-TVMPABNZ.js";import"./chunk-4M6V6BRQ.js";import"./chunk-O2N6PUOM.js";import"./chunk-UNDMYLJW.js";import{f as C,h as l,n as m}from"./chunk-3KENBVE7.js";l();m();var e=C(x());var O=o.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
  width: 100%;
  overflow-y: scroll;
  padding: 16px;
`,k=o.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: -20px;
`,h=o(a).attrs({size:28,weight:500,color:i.colors.legacy.textPrimary})`
  margin-top: 24px;
`,P=o(a).attrs({size:16,weight:500,color:i.colors.legacy.textSecondary})`
  padding: 0px 5px;
  margin-top: 9px;
  span {
    color: ${i.colors.legacy.textPrimary};
  }
  label {
    color: ${i.colors.legacy.accentPrimary};
    cursor: pointer;
  }
`,b=o.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: fit-content;
`,A=o.div`
  margin-top: auto;
  width: 100%;
`,B=()=>{let{t:n}=f(),{mutateAsync:t}=y(),{handleHideModalVisibility:r,handleShowModalVisibility:s}=g(),v=(0,e.useCallback)(()=>{s("swapConfirmation",void 0,{event:"showSwapModal",payload:{data:{uiContext:"SwapConfirmation"}}}),r("swapTermsOfService")},[s,r]),c=S({goToConfirmation:v});return{onAgreeClick:(0,e.useCallback)(()=>{t(!0),c()},[t,c]),onCancelClick:()=>{r("swapTermsOfService")},t:n}},M=()=>{self.open(p,"_blank")},F=()=>{self.open(d,"_blank")},L=e.default.memo(({onAgreeClick:n,onCancelClick:t,t:r})=>e.default.createElement(O,null,e.default.createElement(k,null,e.default.createElement(b,null,e.default.createElement(u,null),e.default.createElement(h,null,r("termsOfServicePrimaryText")),e.default.createElement(P,null,e.default.createElement(w,{i18nKey:"termsOfServiceDiscliamerFeesEnabledInterpolated"},"We have revised our Terms of Service. By clicking ",e.default.createElement("span",null,'"I Agree"')," you agree to our new",e.default.createElement("label",{onClick:M},"Terms of Service"),".",e.default.createElement("br",null),e.default.createElement("br",null),"Our new Terms of Service include a new ",e.default.createElement("label",{onClick:F},"fee structure")," for certain products.")))),e.default.createElement(A,null,e.default.createElement(T,{primaryText:r("termsOfServiceActionButtonAgree"),secondaryText:r("commandCancel"),onPrimaryClicked:n,onSecondaryClicked:t})))),_=()=>{let n=B();return e.default.createElement(L,{...n})},X=_;export{_ as SwapTermsOfServicePage,X as default};
//# sourceMappingURL=SwapTermsOfServicePage-YM63IRI5.js.map
