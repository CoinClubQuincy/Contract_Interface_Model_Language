//
//  DApps.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

import SwiftUI
//MARK: DApps
struct ContractInterface: View {
    @Binding var backgroundColor:LinearGradient
    @State var searchBar:String = ""
    //@StateObject var ciml = ManageCIMLDocument.init()
    @StateObject var contractInterface:ContractModel
    @State var overlayinfo:Bool = false
    @State var showDAppSettings:Bool = false
    @State var showDapplet:[Bool] = [false]
    @State var showDappletLanding:[Bool] = [false]
    
    //remove
    @State var presented: Bool = false
    @State var alertTitle:String = ""
    @State var alertMessage:String = ""
    //
    
    let data = Array(0...0).map { "DApp \($0)" }
    let layout = [
        GridItem(.adaptive(minimum: 80))
    ]
    
    var body: some View {
        NavigationView {
            ZStack {
                backgroundColor
                    .ignoresSafeArea(.all)
                    .navigationBarItems(
                        leading:
                            NavigationLink(
                                destination: Text("Favorites")
                                .navigationTitle("Favorites")
                                ,label: {
                                    Image(systemName: "qrcode")
                                        .resizable()
                                        .scaledToFit()
                                        .foregroundColor(.black)
                                        .padding(.trailing,10)
                                }
                            )
                        ,
                        trailing:
                            NavigationLink(
                                destination: Wallets()
                                .navigationTitle("Wallet")
                                ,label: {
                                    Image(systemName: "wallet.pass.fill")
                                        .resizable()
                                        .scaledToFit()
                                        .foregroundColor(.black)
                                        .padding(.trailing,10)
                                }
                            )
                    )
                //call CoreData to show Dapplet icon and buton press on screen
                VStack {
                    //MARK: DApplet Grid
                    if(showDapplet[0]){
                        DAppletView(contractInterface: contractInterface)
                            .gesture(DragGesture(minimumDistance: 100, coordinateSpace: .local)
                                .onEnded({ value in
                                    if value.translation.height < 0 {
                                        // up
                                        withAnimation {
                                            showDapplet[0] = false
                                        }
                                    }
                                }))
                        
                    }else {
                    HStack {
//                        ForEach(vm.ciml){ciml in
//                            Text(ciml.name ?? "Error")
//                        }
                        TextField("Search...", text: $searchBar)
                            .frame(height: 50)
                            .padding(.leading)
                            .background(Color(.white))
                            .foregroundColor(.black)
                            .cornerRadius(10)
                            .padding(.leading,5)
                            .shadow(radius: 6)
                          
                        Button(action: {
                            contractInterface.getCIML(url: searchBar)
                            showDappletLanding[0].toggle()
                            contractInterface.dappletPage = 0
                            
                            print(contractInterface.dappletPage )
                            print("CIML Button Pressed")
                        }, label: {
                            Image(systemName: "magnifyingglass.circle.fill")
                                .resizable()
                                .scaledToFit()
                                .foregroundColor(.black)
                                .frame(width: 45, alignment: .center)
                                .cornerRadius(10)
                                .padding(.trailing,10)
                        })
                        .sheet(isPresented: $showDappletLanding[0]) {
                            print("Sheet dismissed!")
                        } content: {
                            LandingPage(showDapplet: $showDapplet[0])
                                .presentationDetents([.fraction(0.7)])
                                .presentationDragIndicator(.hidden)
                        }
                    }
                        ScrollView {
                            LazyVGrid(columns: layout, spacing: 20){
                                ForEach(data, id: \.self){item in
                                    HStack {
                                        
                                        Button(action: {
                                            withAnimation {
                                                showDapplet[0].toggle()
                                                contractInterface.openCIML(address: searchBar)
                                            }
                                        }, label: {
                                            VStack{
                                                Image("echo")
                                                    .resizable()
                                                    .scaledToFit()
                                                    .frame(width: 60, height: 60)
                                                    .cornerRadius(10)
                                                    .shadow(radius: 10)
                                                    .padding(5)
                                                Text(item)
                                                    .font(.footnote)
                                                    .foregroundColor(.black)
                                            }
                                        })
                                    }
//                                ZStack{
//                                    Circle()
//                                        .fill(Color.red)
//                                        .frame(width: 20,height: 20)
//
//                                    Text("2")
//                                        .font(.footnote)
//                                        .foregroundColor(.white)
//                                }
                                    .overlay(
                                        Button(action: {
                                            showDAppSettings.toggle()
                                        }, label: {
                                            Image(systemName: "info.circle")
                                                .foregroundColor(.blue)
                                                .background(Color.white)
                                                .cornerRadius(50)
                                        })
                                        .sheet(isPresented: $showDAppSettings) {
                                            //MARK: SettingsPallet
                                            DAppletSettings(DevEnv: contractInterface.DevEnv, newDapplet: false,ciml: contractInterface)
                                        }
                                        , alignment: .topLeading
                                    )
                                }
                            }
                            .padding(.top)
                        }
                    }
                    Spacer()
                }
                .padding(.top)
                .padding(.horizontal)
            }
        }
    }
    
    //MARK: DApp Functions
    func getAlert() -> Alert{
        return Alert(title: Text(alertTitle),
                     message: Text(alertMessage),
                     primaryButton: .destructive(Text("Delete")) {
                         print("Deleting...")
                     },
                     secondaryButton: .cancel())
    }
    
    func buttonAlert(title:String, msg:String){
        alertTitle = title
        alertMessage = msg
        presented.toggle()
    }
    
}


