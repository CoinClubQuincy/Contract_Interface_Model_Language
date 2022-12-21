//
//  BuildTools.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/19/22.
//

import SwiftUI


//MARK: BuildView
struct BuildView: View {
    
    
    @State var showObjects:Bool = false
    @State var showSettings:Bool = false
    @Binding var backgroundColor:LinearGradient
    @StateObject var grid:Grid
    
    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all)
        VStack{
            CIMLFinalView(grid: grid)

            BuildTools(showObjects: $showObjects,showSettings: $showSettings, grid: grid)
                .padding(.bottom)
                .padding(.top)
            }
        }
    }
}

//MARK: BuildTools
struct BuildTools: View {
    @Binding var showObjects:Bool
    @Binding var showSettings:Bool
    @State var txField:String = ""
    @StateObject var grid:Grid

    var body: some View {
        
//        if(showObjects){
//            Spacer().animation(.easeIn)
//        }
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
                Image(systemName: "folder.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            
            Spacer()
            
            Button(action: {
                
            }, label: {
                Image(systemName: "plus")
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
                    .presentationDetents([.fraction(0.75)])
            })


            Spacer()
            
            Button(action: {
                showObjects.toggle()
            }, label: {
                Image(systemName: "doc.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showObjects, content: {
                ObjectsPallet
                    .presentationDetents([.fraction(0.35)])
            })
            
            
        }
        .frame(maxWidth: .infinity)
        .frame(height: 30)
        .padding(.horizontal,30)
    }
    
    //MARK: ObjectsPallet
    var ObjectsPallet: some View{
        VStack{
            ScrollView{
                VStack{
                    HStack{
                        
                        Button(action: {
                            
                        }, label: {
                            Text("Text")
                                .bold()
                                .font(.title3)
                                .foregroundColor(.black)
                                .frame(width: 150,height: 60)
                        })
                        
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
                    
                    VStack{
                        Image(systemName: "questionmark.diamond.fill")
                            .resizable()
                            .scaledToFit()
                            .foregroundColor(.black)
                            .frame(width: 170,height: 60)
                            .cornerRadius(10)
                        Text("icon")
                            .font(.caption)
                    }
                }
                .padding(.top,30)
            }
            //MARK: Object Types
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
        }
    }
    //MARK: Settings Pallet
    var SettingsPallet: some View{
        ZStack{
            List{
                Section("DApplet"){
                    HStack{
                        Circle()
                            .frame(width: 30)
                        Text("SYMBOL")
                    }
                    HStack{
                        Text("{App} Version: ")
                        Spacer()
                        Text("0.0.0")
                            .font(.title3)
                            .bold()
                    }
                    
                    Text("This is the description of the Dapp provided")
                    
                    HStack(){
                        Text("Website:")
                        Text(" https\\:DAppletSite.com")
                            .font(.headline)
                            .foregroundColor(.blue)
                    }
                    
                    HStack{
                        Text("Network:")
                        Spacer()
                        Text("XDC")
                            .font(.title3)
                            .bold()
                    }
                    
                    HStack{
                        VStack{
                            Text("Contract:")
                            Text("Explorer")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        Spacer()
                        Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                            .font(.body)
                            .bold()
                    }
                    HStack{
                        Text("BackgroundColor:")
                    }
                }
                Section("Contract Interface Version"){
                        Text("v1.0.0")
                    Toggle("Show Grid", isOn: $grid.showGrid)
                    }
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
