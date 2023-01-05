//
//  Designer.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

import SwiftUI
import Foundation
import Combine
//Hold all code compiling the CIML UI data
//rename this!!! -> this is the main class that handels the CIML Models
//MARK: ContractModel class
class ContractModel: ObservableObject{ //Build Settings
    @Published var showGrid:Bool = false
    @Published var testnet:Bool = false // may not need
    @Published var DevEnv:Bool = false
    //CIML Cache all data from DAppletUI is stored here
    //State vars??
    @Published var TextList:[CIMLText] = []
    @Published var TextFieldList:[CIMLTextField] = []
    @Published var ButtonList:[CIMLButton] = []
    @Published var SysImageList:[CIMLSYSImage] = []
    @Published var VariableList:[Variable_Model] = []
    @Published var ViewList:[Views] = []
    
    @Published var finalTextList:[CIMLText] = []
    @Published var finalTextFieldList:[CIMLTextField] = []
    @Published var finalButtonList:[CIMLButton] = []
    @Published var finalsysImageList:[CIMLSYSImage] = []
    
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
    //object attributes
    var textField: String = ""
    //Download data from internet
    @Published var ciml: [CIML] = []
    let totalViewCount:Int = 50
    
    var cancellables = Set<AnyCancellable>()
    init(){
        getCIML(url: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-2.json")
    }
    //MARK: get ciml func
    func getCIML(url:String) -> [CIML]{
        print("buton clicked")
        //clearCompiler(compiler: false)
        guard let url = URL(string: url)else { return [] }

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
                self?.parseCIML(ciml: self?.ciml ?? [])
            }
            .store(in: &cancellables)
        
        return self.ciml
    }
    //MARK: Parse Function
    func parseCIML(ciml:[CIML]){
        //Parse CIML Objects
        print("-------------------------------------- CIML DOC --------------------------------------")
        for typ in ciml{
            //MARK: Parse Views
            for viewCount in 0...totalViewCount{
                for view in typ.views{
                    if (view.view == viewCount){
                        ViewList.append(Views(view: view.view ,
                                              object: view.object ,
                                              location: view.location))
                    } else {
                        print("Error incorrect view object: \(String(describing: view.object))")
                    }
                }
            }
            
            for obj in typ.objects {
                //initaillize any atributes that have unique data types
                if(obj.alignment == "center" || obj.alignment == "leading" || obj.alignment == "trailing" ){
                    objectAttributes_alignment(objectAttribute: obj.alignment ?? "center")
                } else if (obj.fontWeight == "regular" || obj.fontWeight == "heavy" || obj.fontWeight == "light" ){
                    objectAttributes_fontWeight(objectAttribute: obj.fontWeight ?? "regular")
                } else if (obj.backgroundColor == "black" /*all major colors */){
                    objectAttributes_backgroundColor(objectAttribute: obj.backgroundColor ?? "clear")
                } else if (obj.font == "headline" /* All Font types */){
                    objectAttributes_Font(objectAttribute: obj.font ?? "headline")
                    //change colors
                } else if (obj.font == "Colors"){
                    objectAttributes_Color(objectAttribute:"Colors")
                }
                //MARK: Parse Text
                if (obj.type == "text"){
                    //add default data optionals
                    print(obj.type)
                    print("---------------------------------------- append textLst")
                    TextList.append(CIMLText(text: obj.value ?? "X",
                                             foreGroundColor: Color(.black),
                                             font: .headline, // add func
                                             frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                             alignment: .center, // add func
                                             backgroundColor: Color(.clear),
                                             cornerRadius: obj.cornerRadius ?? 0,
                                             bold: obj.bold ?? false,
                                             fontWeight: .regular, // add func
                                             shadow: obj.shadow ?? 0,
                                             padding: CGFloat(obj.padding ?? 0),
                                             location: Placement(object: obj.name ?? "nil") ?? 0))
                    print(obj.name)
                    print("check placement")
                    print(TextList.count)
                    //MARK: Parse TextField
                }else if (obj.type == "textField"){
                    TextFieldList.append(CIMLTextField(text: obj.value ?? "error",
                                                       textField: obj.textField ?? "",
                                                       foreGroundColor: .gray,
                                                       frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                       alignment: .all,
                                                       backgroundColor: .white,
                                                       cornerRadius: obj.cornerRadius ?? 0,
                                                       shadow: 0,
                                                       padding: 0,
                                                       location: Placement(object: obj.name ?? "nil") ?? 0))
                    print("text field count")
                    print(obj.type)
                    print(TextFieldList.count)
                    //MARK: Parse Button
                }else if (obj.type == "button"){
                    ButtonList.append(CIMLButton(text: obj.value ?? "Button",
                                                 isIcon: false,
                                                 foreGroundColor: .black,
                                                 font: .headline,
                                                 frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                 alignment: .center,
                                                 backgroundColor: .blue,
                                                 cornerRadius: obj.cornerRadius ?? 0,
                                                 bold: obj.bold  ?? false,
                                                 fontWeight: .regular, // add func
                                                 shadow: obj.shadow ?? 0,
                                                 padding: CGFloat(obj.padding ?? 0),
                                                 location: Placement(object: obj.name ?? "nil") ?? 0))
                    print(obj.type)
                    print(ButtonList.count)
                } else if (obj.type == "iconButton"){
                    ButtonList.append(CIMLButton(text: obj.value ?? "exclamationmark.triangle.fill",
                                                 isIcon: true,
                                                 foreGroundColor: Color(obj.foreGroundColor ?? ".black"),
                                                 font: .headline,
                                                 frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                 alignment: .center,
                                                 backgroundColor: .black,
                                                 cornerRadius: obj.cornerRadius ?? 0,
                                                 bold: obj.bold  ?? false,
                                                 fontWeight: .regular,
                                                 shadow: obj.shadow ?? 0,
                                                 padding: CGFloat(obj.padding ?? 0),
                                                 location: Placement(object: obj.name ?? "nil") ?? 0))
                    print(obj.type)
                    print(ButtonList.count)
                    //MARK: Parse SysImage
                }else if (obj.type == "sysimage"){
                    SysImageList.append(CIMLSYSImage(name: obj.value ?? "exclamationmark.triangle.fill",
                                                     frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                     padding: 0,
                                                     color: .black,
                                                     location: Placement(object: obj.name ?? "nil") ?? 0))
                    print(obj.type)
                    print(SysImageList.count)
                } else {
                    print("Error incorrect object type: \(String(describing: obj.type))")
                }
            }
            
            //MARK: Parse Vars
            for vars in typ.variables{
                if (vars.type == "var"){
                    VariableList.append(Variable_Model(varName: vars.name ?? "varName Error",
                                                       type: vars.type ?? "varType Error",
                                                       value: vars.value ?? "varValue Error"))
                } else {
                    print("Error incorrect variable type: \(String(describing: vars.type))")
                }
            }

            
            print("total TextList: ",TextList.count)
            print("total TextField: ",TextFieldList.count)
            print("total SysImageList: ",SysImageList.count)
            print("total ButtonList: ",ButtonList.count)
            print("total ViewList: ",ViewList.count)
        }
    }
    
    func Placement(object:String) -> (Int){
        for objectLocation in ViewList{
            print(objectLocation.object)
            if(objectLocation.object == object){
                print(objectLocation.location)
                return objectLocation.location
            }
        }
        return (0)
    }
    
    //MARK: Object attributes functions
    func objectAttributes_alignment(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_fontWeight(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_backgroundColor(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_Font(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_Color(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    
    //MARK: Manage CIML Document
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
    
    //true clears final view
    //false clears entire Dapplet
    func clearCompiler(compiler:Bool){
        if(compiler){
            finalTextList.removeAll()
            finalTextFieldList.removeAll()
            finalsysImageList.removeAll()
            finalButtonList.removeAll()
        } else {
            TextList.removeAll()
            TextFieldList.removeAll()
            SysImageList.removeAll()
            ButtonList.removeAll()
        }
        
        
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
    //MARK: DApplet Projector
    var body: some View{
        ZStack {
            ForEach(contractInterface.TextList) { list in
                if cordinates == list.location {
                    TEXT(text: list.text, foreGroundColor: list.foreGroundColor, font: list.font,
                         frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                         cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                         shadow: list.shadow, padding: list.padding, location: list.location)
                }
            }
            
            ForEach(contractInterface.TextFieldList){ list in
                if cordinates == list.location {
                    TEXT_FIELD(text: list.text, textField: list.textField, foreGroundColor: list.foreGroundColor, frame: list.frame,
                            alignment: list.alignment, backgroundColor: list.backgroundColor,
                               cornerRadius: list.cornerRadius, shadow: list.shadow,padding: list.padding ,location: list.location)
                }
            }
            ForEach(contractInterface.SysImageList){ list in
                if cordinates == list.location {
                    SYSIMAGE(sysname: list.name, frame: list.frame, padding: list.padding, color: .black, location: list.location)
                }
            }
            ForEach(contractInterface.ButtonList){ list in
                if cordinates == list.location {
                    BUTTONS(text: list.text, isIcon: list.isIcon, foreGroundColor: list.foreGroundColor, font: list.font,
                            frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                            cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                            shadow: list.shadow, padding: list.padding, location: list.location)
                }
            }
        }
        .onAppear {

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

