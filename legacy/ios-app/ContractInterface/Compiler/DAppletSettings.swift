//
//  DAppletSettings.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/29/22.
//

import SwiftUI

struct DAppletSettings: View {
    @StateObject private var dappVM = DAppListVM()
    @State var alertTitle:String = ""
    @State var alertMessage:String = ""
    @State var presented: Bool = false
    @State var totalNotifications:Int = 0
    var DappletID:Int
    var DevEnv:Bool
    var newDapplet:Bool
    @State var testnets:Bool = false
    @StateObject var ciml = ContractModel()

    enum settingStatus {
        case edit, delete, open
    }

    var body: some View{
        VStack{
            List{
                Section("DApplet"){
                    Image("XTB")
                        .resizable()
                        .scaledToFit()
                    HStack{
                        Circle()
                            .frame(width: 30)
                        
                        Text(ciml.name)
                        Text("-")
                        Text(ciml.symbol)
                    }
                    if(!DevEnv){
                        HStack{ // Event Listener
                            Text("Notifications: ")
                            Spacer()
                            Circle()
                                .frame(width: 30)
                                .foregroundColor(.red)
                                .overlay{
                                    Text("\(totalNotifications)")
                                        .font(.title3)
                                        .bold()
                                }
                        }
                    }
                    HStack{
                        Text("{App} Version: ")
                        Spacer()
                        Text(ciml.appVersion)
                            .font(.title3)
                            .bold()
                    }
                    
                    Text(ciml.description)
                    
                    HStack(){
                        Text("Website:")
                        Text(ciml.websitelink)
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
                        }
                        Spacer()
                        Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                            .font(.body)
                            .bold()
                    }
                    HStack{
                        VStack{
                            Image(systemName: "network")
                            Text("Explorer")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        
                        Spacer()
                        
                        VStack{
                            Image(systemName: "qrcode")
                            Text("CI Schema")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                    }
                }
                Section("Contract Interface"){
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("v1.0.0")
                            .bold()
                    }
                    if(DevEnv){
                        Toggle("Grid", isOn: $ciml.showGrid)
                        Toggle("Dev Enviroment", isOn: $testnets)
                    }
                }
                Section("3rd Party Verification "){
                    HStack {
                        Text("CoinClubLabs")
                        Spacer()
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                        }
                    }
                }
                HStack(alignment: .center){
                    Spacer()
                    Button(action: {
                        if(DevEnv){
                            
                        }else {
                            deleteDApp(index: DappletID)
                        }
                    }, label: {
                        Text(DevEnv ? "Edit":"Delete")
                            .font(.title)
                            .foregroundColor(.black)
                            .bold()
                            .frame(alignment: .center)
                    })
                    Spacer()
                }
                .listRowBackground(DevEnv ? Color.blue:Color.red)
            }
            .listStyle(.grouped)
        }
    }
    
    var AlterType: some View{
        Button(action: {
            if(DevEnv){
                buttonAlert(title: "Edit DApplet", msg: "Are you sure you want to Edit this Dapplet?")
            } else{
                //Delete data from Core data
            }
        }, label: {
            Text(newDapplet ? "Edit":"Delete")
                .cornerRadius(20)
                .frame(maxWidth: .infinity)
                .foregroundColor(.black)
                .padding()
        })
        .background(newDapplet ? Color.blue:Color.red)
        //.background(newDapplet ? Color.red:Color.blue)
        .alert(isPresented: $presented, content: {
            getAlert()
        })

    }
    
    func deleteDApp(index: Int){
            print(index)
            print(dappVM.dapps)
            print("End")
        
            let dapp = dappVM.dapps[index]
            
            dappVM.deleteDApp(DApp: dapp)
            
            dappVM.getDApps()
        
    }
    
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
    func DAppletSettingStatus(status: settingStatus) -> String? {
        switch status {
        case .delete:
            return "Delete"
        case .edit:
            return "Edit"
        case .open:
            return "Open"
        }
    }
}

