//
//  DApps.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

import SwiftUI
import CodeScanner
import Combine
import Core

//MARK: DApps
struct ContractInterface: View {
    @StateObject private var addCIML = ContractModel()
    @StateObject private var dappVM = DAppListVM()
    @StateObject private var web3Wallet = Web3wallet()
    @Environment(\.presentationMode) var presentationMode
    
    @Binding var backgroundColor:LinearGradient
    @State var searchBar:String = ""
    //@StateObject var ciml = ManageCIMLDocument.init()
    @StateObject var contractInterface:ContractModel
    @State var overlayinfo:Bool = false
    @State var showDAppSettings:Bool = false
    @State var showDapplet:[Bool] = [false]
    @State var showDappletLanding:Bool = false
    
    @State var presented: Bool = false
    @State var alertTitle:String = ""
    @State var alertMessage:String = ""
    
    
    @State var isPresentingScanner = false
    @State var scannedCode: String = "Scan CIML QR Document"
    
    @State private var isLoading = false
    let showDappletLandingSubject = CurrentValueSubject<Bool, Never>(false)
    
    let abi: String = """
[
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "Bool",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "Numb",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "String",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "read",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "_bool",
                "type": "bool"
            }
        ],
        "name": "writeBool",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_int",
                "type": "uint256"
            }
        ],
        "name": "writeINT",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_string",
                "type": "string"
            }
        ],
        "name": "writeString",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

"""
    
    var scannerSheet : some View {
        ZStack{
            CodeScannerView(codeTypes: [.qr]) { response in
                if case let .success(result) = response {
                    scannedCode = result.string
                    isPresentingScanner = false
                    contractInterface.getCIML(url: scannedCode)
                    showDappletLanding.toggle()
                    print("Scanned Code \(scannedCode)")
                }
            }
        }.onAppear{
            print("currently running read function")
            Task{
                await web3Wallet.ReadDApp(abiString: abi, ContractAddress: EthereumAddress("0x8561145E722A2AD0e73c7d2Dc95FCE9C1664153f", type: .normal)!, Function: "read", param: [], from: "0x981f101912bc24E882755A6DD8015135D0cc4D4D")
                
                await web3Wallet.WriteDApp(abiString: abi, ContractAddress: EthereumAddress("0x8561145E722A2AD0e73c7d2Dc95FCE9C1664153f", type: .normal)!, Function: "writeINT", param: ["2020"], from: "0x981f101912bc24E882755A6DD8015135D0cc4D4D")
                    
            }
        }
    }
    
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
                            Image(systemName: "qrcode")
                                .resizable()
                                .scaledToFit()
                                .foregroundColor(.black)
                                .padding(.trailing,10)
                                .onTapGesture(count: 1) {
                                    print("tapped!")
                                    isPresentingScanner = true
                                }
                                .sheet(isPresented: $isPresentingScanner){
                                    scannerSheet
                                }
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
                        Text("Origin: \(contractInterface.contractMainnet)")
                            .font(.caption)
                            .bold()
                            .frame(maxWidth: .infinity)
                            .frame(height: 13)
                            .shadow(radius: 20)
                            .background(Color.green)
                            .foregroundColor(.black)
                            .cornerRadius(20)
                            .padding(.horizontal,20)
                        
                        
                        Text("type: value:")
                            .font(.caption)
                            .frame(maxWidth: .infinity)
                            .frame(height: 13)
                            .shadow(radius: 20)
                            .background(Color.gray)
                            .foregroundColor(.black)
                            .cornerRadius(20)
                            .padding(.horizontal,50)

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
                            isLoading = true
                            contractInterface.dappletPage = 0
                            contractInterface.getCIML(url: searchBar)
                            //showDapplet[0].toggle()
                            showDappletLanding.toggle()
                            isLoading = false

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
                        .sheet(isPresented: $showDappletLanding,onDismiss:{
//                                    contractInterface.save()
//                                    presentationMode.wrappedValue.dismiss()

//                            ForEach(dappVM.dapps, id: \.id){dapp in
//                                ZStack{}
//                                    .onReceive(showDappletLandingSubject) {_ in
//                                        if(contractInterface.contractMainnet == dapp.contractMainnet ){
//                                            print("Already have DApp")
//
//                                        } else {
//                                            print("Save Dapp")
//                                            print(contractInterface.contractMainnet)
//                                            print("next")
//                                            print(dapp.contractMainnet)
//                                            contractInterface.save()
//                                            presentationMode.wrappedValue.dismiss()
//                                        }
//                                    }
//                            }

                        }){
                            withAnimation {
                                LandingPage(ciml: contractInterface, showDapplet: $showDapplet[0])
                                    .presentationDetents([.fraction(0.7)])
                                    .presentationDragIndicator(.hidden)
                                    .onAppear{
                                        showDappletLandingSubject.send(true)
                                    }
                            }
                        }
                    }
                    
                    ScrollView {
                        LazyVGrid(columns: layout, spacing: 20){
                            ForEach(dappVM.dapps, id: \.id){dapp in
                                HStack {
                                    
                                    Button(action: {
                                        withAnimation {
                                            contractInterface.openCIML(address: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-3.json")
                                            
                                            showDapplet[0].toggle()
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
                                            Text(dapp.name)
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
                                        DAppletSettings(DappletID: dapp.id.hash, DevEnv: contractInterface.DevEnv, newDapplet: false,ciml: contractInterface)
                                    }
                                    , alignment: .topLeading
                                )
                            }
                            /* ForEach(data, id: \.self){item in
                                HStack {
                                    
                                    Button(action: {
                                        withAnimation {
                                            showDapplet[0].toggle()
                                            contractInterface.openCIML(address: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-3.json")
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
                            } */
                        }
                        .padding(.top)
                    }
                    }
                    Spacer()
                }
                .padding(.top)
                .padding(.horizontal)
            }
            .overlay{
                ZStack {
                    if(isLoading){
                        Spinner(spinnerStart: 0.0, spinnerEndS1: 0.03, rotationDegreeS1: .degrees(360))
                    }
                }.frame(width: 200, height: 200)
            }
        }
        .onAppear{
        dappVM.getDApps()
        
        let urls = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        print("old path: \(urls)")
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

struct Spinner: View {

    let rotationTime: Double = 0.75
    let fullRotation: Angle = .degrees(360)

    @State var spinnerStart: CGFloat
    @State var spinnerEndS1: CGFloat
    @State var rotationDegreeS1: Angle
    let animationTime: Double = 1.2

    var body: some View {
        ZStack {
            // S1
            SpinnerCircle(start: spinnerStart, end: spinnerEndS1, rotation: rotationDegreeS1, color: .blue)

        }.frame(width: 200, height: 200)
        .onAppear() {
            Timer.scheduledTimer(withTimeInterval: animationTime, repeats: true) { (mainTimer) in
                self.animateSpinner()
            }
        }
    }

    // MARK: Animation methods
    func animateSpinner(with timeInterval: Double, completion: @escaping (() -> Void)) {
        Timer.scheduledTimer(withTimeInterval: timeInterval, repeats: false) { _ in
            withAnimation(Animation.easeInOut(duration: rotationTime)) {
                completion()
            }
        }
    }

    func animateSpinner() {
            animateSpinner(with: rotationTime) { self.spinnerEndS1 = 1.0 }

            animateSpinner(with: (rotationTime * 2) - 0.025) {
                self.rotationDegreeS1 += fullRotation
            }

            animateSpinner(with: (rotationTime * 2)) {
                self.spinnerEndS1 = 0.03
            }

            animateSpinner(with: (rotationTime * 2) + 0.0525) { self.rotationDegreeS1 += fullRotation }

            //animateSpinner(with: (rotationTime * 2) + 0.225) { self.fullRotation += fullRotation }
        }
    
}

struct SpinnerCircle: View {
    var start: CGFloat
    var end: CGFloat
    var rotation: Angle
    var color: Color

    var body: some View {
        Circle()
            .trim(from: start, to: end)
            .stroke(style: StrokeStyle(lineWidth: 20, lineCap: .round))
            .fill(color)
            .rotationEffect(rotation)
    }
}


