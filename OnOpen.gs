function onOpen(){
  
  //シートを開いたときにメニューを追加する
  
  var myMenu=[
    {name:"①ISBNの正規化",functionName:"myFunction_isbnfix"},
    {name:"②書籍情報の取得",functionName:"myFunction_bookdata"},
    {name:"③蔵書情報の取得",functionName:"zousyoNormalCall"},
    {name:"取得のリトライ",functionName:"zousyoRetryCall"}
  ];  
  
  SpreadsheetApp.getActiveSpreadsheet().addMenu("★リサーチツール", myMenu);
  
}

function zousyoNormalCall(){
  myFunction_zousyo("normal");
}

function zousyoRetryCall(){
  myFunction_zousyo("retry");
}