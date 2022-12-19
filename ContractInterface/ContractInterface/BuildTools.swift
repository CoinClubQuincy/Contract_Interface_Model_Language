//
//  BuildTools.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/19/22.
//

import SwiftUI


struct BuildView: View {
    @State var showObjects:Bool = false
    @State var showSettings:Bool = false
    @Binding var backgroundColor:LinearGradient
    
    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all)
        VStack{
            CIMLFinalView()
            if(showObjects){
                Spacer().animation(.easeIn)
            }
            BuildTools(showObjects: $showObjects,showSettings: $showSettings)
                .padding(.bottom)
                .padding(.top)
            }
        }
    }
}


struct BuildTools: View {
    @Binding var showObjects:Bool
    @Binding var showSettings:Bool
    @State var txField:String = ""

    var body: some View {
        HStack{
            Button(action: {
                
            }, label: {
                Image(systemName: "trash")
                    .resizable()
                    .scaledToFit()
            })
            
            
            Spacer()
            
            Button(action: {
                
            }, label: {
                Image(systemName: "doc.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            
            Spacer()
            
            Button(action: {
                showSettings.toggle()
            }, label: {
                Image(systemName: "gear")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showSettings, content: {
                SettingsPallet
                    .presentationDetents([.fraction(0.40)])
            })


            Spacer()
            
            Button(action: {
                showObjects.toggle()
            }, label: {
                Image(systemName: "folder.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showObjects, content: {
                ObjectsPallet
                    .presentationDetents([.fraction(0.40)])
            })
            
            
        }
        .frame(maxWidth: .infinity)
        .frame(height: 30)
        .padding(.horizontal,30)
    }
    
    var ObjectsPallet: some View{
        VStack{
            ScrollView{
                VStack{
                    HStack{
                        Text("Text")
                            .bold()
                            .font(.title3)
                            .foregroundColor(.black)
                            .frame(width: 150,height: 60)
                        
                        Text("Button")
                            .bold()
                            .foregroundColor(.black)
                            .frame(width: 150,height: 60)
                            .background(Color.blue)
                            .cornerRadius(10)
                    }
                    TextField("TextField...", text: $txField)
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 150,height: 60)
                        .background(Color.gray)
                        .cornerRadius(10)
                    
                    Image(systemName: "questionmark.diamond.fill")
                        .resizable()
                        .scaledToFit()
                        .foregroundColor(.black)
                        .frame(width: 170,height: 60)
                        .cornerRadius(10)
                    
                }
                .padding(.top,30)
            }
            HStack(alignment: .center){
                
                Button(action: {
                    
                }, label: {
                    Text("Variables")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
                Button(action: {
                    
                }, label: {
                    Text("Functions")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
                Button(action: {
                    
                }, label: {
                    Text("Objects")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
            }
            .padding(.top)
        }
    }
    
    var SettingsPallet: some View{
        ZStack{
            List{
                HStack{
                    Circle()
                        .frame(width: 30)
                    Text("NAME : SYMBL")
                }
                Text("{App} Version: 0.0.0")
                Text("CIML Version: 0.0.0")
                Text("This is the description of the Dapp provided")
                Text("Networks: XDC")
                Text("Contract Origin: 0x0000000000000000")
            }
        }
    }
}


//"cimlVersion": "1.0.1",
//"appVersion": "0.0.1",
//"contractLanguage": "solidity ^0.8.10",
//"name": "LedgerContract",
//"symbol": "LC",
//"logo": "https\\:ipfs.address.url.jpeg",
//"thumbnail": "https\\:ipfs.address.url.jpeg",
//"description": "This is the description of the Dapp provided",
//"contractOrigin": "xdcerG45fCgvgh&%vhvctcr678BB",
