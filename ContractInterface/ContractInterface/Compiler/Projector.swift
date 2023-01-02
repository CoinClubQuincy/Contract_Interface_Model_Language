//
//  Designer.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

//
//  CIML_Compiler.swift
//  CoinClubCrypto
//
//  Created by Quincy Jones on 11/5/22.
//

import SwiftUI
import Foundation
import Combine
//MARK: ContractModel class
//Hold all code compiling the CIML UI data
//rename this!!! -> this is the main class that handels the CIML Models
class ContractModel: ObservableObject{ //Build Settings
    @Published var showGrid:Bool = false
    @Published var testnet:Bool = false // may not need
    @Published var DevEnv:Bool = false
    //CIML Cache all data from DAppletUI is stored here
    @Published var TextList:[CIMLText] = []
    @Published var TextFieldList:[CIMLTextField] = []
    @Published var ButtonList:[CIMLButton] = []
    @Published var SysImageList:[CIMLSYSImage] = []
    @Published var VariableList:[Variable_Model] = []
    //All CIML variables
    var cimlVersion:String = ""
    var appVersion:String = ""
    var contractLanguage:String = ""
    var name:String = ""
    var symbol:String = ""
    var logo:String = ""
    var thumbnail:String = ""
    var websitelink:String = ""
    var cimlURL:String = ""
    var description:String = ""
    var networks:Any = []
    var contractMainnet:Any = []
    var screenShots: [String] = []
    var abi:String = ""
    var byteCode:String = ""
    var variables: [Object] = []
    var functions: [String] = []
    var objects: [Object] = []
    var views: [Views] = []
    var metadata: [String] = []
    //Download data from internet
    @Published var ciml: [CIML] = []
    
    var cancellables = Set<AnyCancellable>()
    init(){
        getCIML(url: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-1.json")
    }
    func getCIML(url:String){
        guard let url = URL(string: url) else { return }

        URLSession.shared.dataTaskPublisher(for: url)
            .subscribe(on: DispatchQueue.global(qos: .background))
            .receive(on: DispatchQueue.main)
            .tryMap{ (data,response) -> JSONDecoder.Input in

                guard let response = response as? HTTPURLResponse,response.statusCode >= 200 && response.statusCode < 300 else {
                    throw URLError(.badServerResponse)
                }
                return data
            }
            .decode(type: [CIML].self, decoder: JSONDecoder())
            .sink { completion in
                if case .failure(let error) = completion {
                    print(error.localizedDescription)
                }
            } receiveValue: { [weak self] returnedCIML in
                print("Completion: \(returnedCIML)")
                self?.ciml = returnedCIML
            }
            .store(in: &cancellables)
        
        //parseCIML(ciml: ciml[0])
    }
    func parseCIML(ciml:[CIML]){
        //Parse CIML Header and Metadata
        cimlVersion = ciml[0].cimlVersion ?? ""
        appVersion = ciml[0].appVersion ?? ""
        contractLanguage = ciml[0].contractLanguage ?? ""
        name = ciml[0].name ?? ""
        symbol = ciml[0].symbol ?? ""
        logo = ciml[0].logo ?? ""
        thumbnail = ciml[0].thumbnail ?? ""
        websitelink = ciml[0].websitelink ?? ""
        cimlURL = ciml[0].cimlURL ?? ""
        description = ciml[0].description ?? ""
        networks = ciml[0].networks[0] ?? ""
        contractMainnet = ciml[0].contractMainnet[0] ?? ""
        screenShots = ciml[0].screenShots ?? ""
        abi = ciml[0].abi ?? ""
        byteCode = ciml[0].byteCode ?? ""
        //Parse CIML Objects
        ForEach(ciml[0].objects){obj in
            if (obj.type == "text"){
                //add default data optionals
                TextList.append(CIMLText(text: obj.value,
                                         foreGroundColor: obj.foreGroundColor,
                                         font: obj.font,
                                         frame: [obj.frame[0],obj.frame[0]],
                                         alignment: obj.alignment,
                                         backgroundColor: obj.backgroundColor,
                                         cornerRadius: obj.cornerRadius,
                                         bold: obj.bold,
                                         fontWeight:obj.fontWeight,
                                         shadow: obj.shadow,
                                         padding: obj.padding,
                                         location: obj.location))
            }else if (obj.type == "textField"){
                TextFieldList.append(CIMLTextField(text: <#T##String#>,
                                                   textField: <#T##String#>,
                                                   foreGroundColor: <#T##Color#>,
                                                   frame: <#T##[CGFloat]#>,
                                                   alignment: <#T##Edge.Set#>,
                                                   backgroundColor: <#T##Color#>,
                                                   cornerRadius: <#T##CGFloat#>,
                                                   shadow: <#T##CGFloat#>,
                                                   padding: <#T##CGFloat#>,
                                                   location: <#T##Int#>))
            }else if (obj.type == "button"){
                ButtonList.append(CIMLButton(text: <#T##String#>,
                                             isIcon: <#T##Bool#>,
                                             foreGroundColor: <#T##Color#>,
                                             font: <#T##Font#>,
                                             frame: <#T##[CGFloat]#>,
                                             alignment: <#T##Alignment#>,
                                             backgroundColor: <#T##Color#>,
                                             cornerRadius: <#T##CGFloat#>,
                                             bold: <#T##Bool#>,
                                             fontWeight: <#T##Font.Weight#>,
                                             shadow: <#T##CGFloat#>,
                                             padding: <#T##CGFloat#>,
                                             location: <#T##Int#>))
            }else if (obj.type == "sysimage"){
                SysImageList.append(CIMLSYSImage(name: <#T##String#>,
                                                 frame: <#T##[CGFloat]#>,
                                                 padding: <#T##CGFloat#>,
                                                 color: <#T##Color#>,
                                                 location: <#T##Int#>))
            } else if (obj.type == "var"){
                VariableList.append(Variable_Model(varName: <#T##String#>,
                                                   type: <#T##String#>,
                                                   value: <#T##String#>))
            }
        }
        //variables: [Object] = []
        //functions: [String] = []
        //objects: [Object] = []
        //views: [Views] = []
        //metadata: [String] = []
    }
    func openCIML(address:String){
        print("you opend: \(address) DApplet")
    }
    func deleteCIML(address:String){
        print("you deleted: \(address) DApplet")
    }
    //add Objects to MoodelViews
    func addBuildText(token:CIMLText){
        if(DevEnv){ TextList.append(token)} else { return }
    }
    func addBuildTextField(token:CIMLTextField){
        if(DevEnv){ TextFieldList.append(token) } else { return }
    }
    func addBuildSYSImage(token:CIMLSYSImage){
        if(DevEnv){ SysImageList.append(token) } else { return }
    }
    func addBuildButton(token:CIMLButton){
        if(DevEnv){ ButtonList.append(token) } else { return }
    }
    
    func clearCompiler(){
        TextList.removeAll()
        TextFieldList.removeAll()
        SysImageList.removeAll()
        ButtonList.removeAll()
    }
    //Button Actions
    func segueAction(page:Int){}
    
    func Web3Action(){}
    
    private func editCIML(address:String){
        print("you edited: \(address) DApplet")
    }
}

//MARK: Final View // View Comiler
struct DAppletView: View {
    //@State var gridStatus:Bool = true
    @State var gridPlotView:Color = .black
    @State var gridNumberView:Color = .white
    var deviceSize:Double = 1.0
    @StateObject var contractInterface:ContractModel
    
    
    let data = Array(1...146).map { "\($0)" }
    let layout = [
        GridItem(.adaptive(minimum: 30,maximum: 30))
    ]
    
    var body: some View {
        ZStack {
            NavigationView{
                GeometryReader{geo in
                    
                    RoundedRectangle(cornerRadius: 15)
                        .frame(width: geo.size.width * 1.0,height: geo.size.height * 1.0)
                        .foregroundColor(.yellow)
                        .background(Color.black)
                        .onAppear{
                            //Color or Gradient
                        }
                    
                    LazyVGrid(columns: layout){
                        ForEach(data, id: \.self){item in
                            ZStack {
                                Circle()
                                    .foregroundColor(contractInterface.showGrid ? .black : .clear)
                                    .overlay{
                                        Text("\(item)")
                                            .foregroundColor(contractInterface.showGrid ? .white : .clear)
                                    }
                            }
                            .foregroundColor(gridPlotView)
                            .frame(height: geo.size.width * 0.1)
                            .overlay{
                                Overlay(cordinates: Int(item)!)
                            }
                        }
                    }
                }
            }
            .navigationBarItems(
                leading:
                    Image(systemName: "folder.badge.plus")
                    .foregroundColor(.blue)
                ,trailing:
                    NavigationLink(
                        destination: Text("Favorites")
                            .navigationTitle("Favorites")
                        ,label: {
                            Image(systemName: "plus")
                                .foregroundColor(.blue)
                        })
            )
        }
        .cornerRadius(15)
        .shadow(radius: 20)
        .background(Color.clear)
        .frame(width: 360*deviceSize, height: 640*deviceSize)
        
        
    }

}
//MARK: OverLay View
struct Overlay: View{// Compiler
    //@StateObject var vmCIML = ManageCIMLDocument()
    var test:Double = 1.0
    @StateObject var contractInterface = ContractModel()
    
    @State var finalTextList:[CIMLText] = []
    @State var finalTextFieldList:[CIMLTextField] = []
    @State var finalButtonList:[CIMLButton] = []
    @State var finalsysImageList:[CIMLSYSImage] = []
    var cordinates:Int
    
    var body: some View{
        
        ZStack {
            ForEach(finalTextList) { list in
                if cordinates == list.location {
                    TEXT(text: list.text, foreGroundColor: list.foreGroundColor, font: list.font,
                         frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                         cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                         shadow: list.shadow, padding: list.padding, location: list.location)
                }
            }
            
            ForEach(finalTextFieldList){ list in
                if cordinates == list.location {
                    TEXT_FIELD(text: list.text, textField: list.textField, foreGroundColor: list.foreGroundColor, frame: list.frame,
                            alignment: list.alignment, backgroundColor: list.backgroundColor,
                               cornerRadius: list.cornerRadius, shadow: list.shadow,padding: list.padding ,location: list.location)
                }
            }
            ForEach(finalsysImageList){ list in
                if cordinates == list.location {
                    SYSIMAGE(sysname: list.name, frame: list.frame, padding: list.padding, color: .black, location: list.location)
                }
            }
            ForEach(finalButtonList){ list in
                if cordinates == list.location {
                    BUTTONS(text: list.text, isIcon: list.isIcon, foreGroundColor: list.foreGroundColor, font: list.font,
                            frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                            cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                            shadow: list.shadow, padding: list.padding, location: list.location)
                }
            }
        }
        .onAppear {
            finalTextList.append(CIMLText(text: "Exit",font: .title, frame: [100,50], location: 119))
                finalTextList.append(CIMLText(text: String("This is a header"),font: .largeTitle,frame: [300,50], location: 5))
                finalTextFieldList.append(CIMLTextField(text: "enter text",textField: "",foreGroundColor: .black, location: 32))
                finalsysImageList.append(CIMLSYSImage(name: "clipboard",padding: 0, location: 90))
                finalButtonList.append(CIMLButton(text: "gear",isIcon: true,font: .title, location: 1))
            
            print("total finalTextList: ",finalTextList.count)
            print("total TextField: ",finalTextFieldList.count)
            print("total finalsysImageList: ",finalsysImageList.count)
            print("total finalButtonList: ",finalButtonList.count)
            //print("total CIML Data from internet: \(vmCIML.ciml.count)")
        }
    }
}
//MARK: TEXT View
struct TEXT: View {
    let id: String = UUID().uuidString
    var text:String
    var foreGroundColor:Color
    var font:Font
    var frame:[CGFloat]
    var alignment:Alignment
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var bold:Bool
    var fontWeight:Font.Weight
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int

    var body: some View {
        Text(text)
            .foregroundColor(foreGroundColor)
            .font(font)
            .frame(width: frame[0], height: frame[1], alignment: alignment)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .bold(bold)
            .fontWeight(fontWeight)
            .shadow(radius: shadow)
            .padding(padding)
    }
}
//MARK: TEXTFIELD View
struct TEXT_FIELD:View{
    var text:String
    @State var textField:String
    var foreGroundColor:Color
    var frame:[CGFloat]
    var alignment:Edge.Set
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int
 
    var body: some View {
        TextField(text, text: $textField)
            .padding(10)
            .frame(width: frame[0])
            .frame(height: frame[1])
            .foregroundColor(foreGroundColor)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .padding(alignment,padding)
            .shadow(radius: shadow)
        
    }
}
//MARK: SYSIMAGE View
struct SYSIMAGE:View{
    var sysname:String
    var frame:[CGFloat]
    var padding:CGFloat
    var color:Color
    var location:Int
    
    var body: some View {
        Image(systemName: sysname)
            .resizable()
            .scaledToFit()
            .foregroundColor(color)
            .frame(width: frame[0])
            .padding(padding)
        }
}
//MARK: BUTTONS View
struct BUTTONS:View{
    var text:String
    var isIcon:Bool
    var foreGroundColor:Color
    var font:Font
    var frame:[CGFloat]
    var alignment:Alignment
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var bold:Bool
    var fontWeight:Font.Weight
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int
   //@State var finalButtonLabelList:[CIMLText]
    
    var body: some View {
        ZStack {
            Button(action: {
                //Types:
                //Toggle Button
                //Submit Function
                //Segue
            }, label: {
                if(isIcon){
                    Image(systemName: text)
                        .foregroundColor(foreGroundColor)
                        .frame(width: frame[0], height: frame[1], alignment: alignment)
                        .background(isIcon ? .clear : backgroundColor)
                        .shadow(radius: shadow)
                        .padding(padding)
                } else{
                    Text(text)
                        .foregroundColor(foreGroundColor)
                        .font(font)
                        .frame(width: frame[0], height: frame[1], alignment: alignment)
                        .background(backgroundColor)
                        .cornerRadius(cornerRadius)
                        .bold(bold)
                        .fontWeight(fontWeight)
                        .shadow(radius: shadow)
                        .padding(padding)
                }
            })
        }
    }
    
}

