//
//  BuildView.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/29/22.
//

import SwiftUI

//MARK: BuildView
struct BuildView: View {

    @State var showObjects:Bool = false
    @State var showSettings:Bool = false
    @Binding var backgroundColor:LinearGradient
    @StateObject var contractInterface:ContractModel
    
    @State var ObjectTypes:Int = 0 // toolbarstatus and object types
    @State var objectTitle:String = "Text"
    
    @State var objectTypeSelected=0
    @State var objectForeGroundColor: Color = .black
    @State var objectFont: Font = .headline
    @State var objectSize:[CGFloat] = [100,50]
    @State var objectAlignment:Alignment = .center
    
    @State var objectBackgroundColor:Color = .blue
    @State var objectCornerRadius:CGFloat = 0
    @State var objectBold:Bool = false
    @State var objectFontWeight:Font.Weight = .regular
    @State var objectShadow:CGFloat = 0
    @State var objectPadding:CGFloat = 5
    @State var objectTextFieldAlignment:Edge.Set = .all

    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all)
        VStack{
            CIMLFinalView(contractInterface: contractInterface)
            //MARK: BuildTools Bar & Object placeholder
            switch ObjectTypes {
            case 0:
                BuildTools(
                    showObjects: $showObjects,
                    showSettings: $showSettings,
                    toolbarStatus: $ObjectTypes,
                    objectTitle: $objectTitle,
                    contractInterface: contractInterface,
                    objectForeGroundColor: $objectForeGroundColor,
                    objectFont: $objectFont,
                    objectSize: $objectSize,
                    objectAlignment: $objectAlignment,
                    objectBackgroundColor: $objectBackgroundColor,
                    objectCornerRadius: $objectCornerRadius,
                    objectBold: $objectBold,
                    objectFontWeight: $objectFontWeight,
                    objectShadow: $objectShadow,
                    objectPadding: $objectPadding,
                    objectTextFieldAlignment: $objectTextFieldAlignment)
                .padding(.bottom)
                .padding(.top)
            case 1: // Text
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectTypeSelected == 1 ? .clear:objectBackgroundColor)
                    .cornerRadius(objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
                    .onDrag{
                        NSItemProvider(object: "Text" as NSString)
                    }
                back
            case 2: // Button
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 2 ? 20.0:objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
                back
            case 3: // TextField
                Text(objectTitle)
                    .padding()
                    .frame(width: objectTypeSelected == 3 ? 200:objectSize[0])
                    .frame(height: objectSize[1])
                    .foregroundColor(objectForeGroundColor)
                    .background(objectTypeSelected == 3 ? .gray:objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 3 ? 10:objectCornerRadius)
                    .padding(objectTextFieldAlignment,objectPadding)
                    .shadow(radius: objectShadow)
                back
            case 4: // sysImage
                Image(systemName: objectTitle)
                    .resizable()
                    .scaledToFit()
                    .foregroundColor(objectForeGroundColor)
                    .frame(width: objectTypeSelected == 4 ? 40.0:objectSize[0])
                    .padding(objectPadding)
                back
            default:
                BuildTools(
                    showObjects: $showObjects,
                    showSettings: $showSettings,
                    toolbarStatus: $ObjectTypes,
                    objectTitle: $objectTitle,
                    contractInterface: contractInterface,
                    objectForeGroundColor: $objectForeGroundColor,
                    objectFont: $objectFont,
                    objectSize: $objectSize,
                    objectAlignment: $objectAlignment,
                    objectBackgroundColor: $objectBackgroundColor,
                    objectCornerRadius: $objectCornerRadius,
                    objectBold: $objectBold,
                    objectFontWeight: $objectFontWeight,
                    objectShadow: $objectShadow,
                    objectPadding: $objectPadding,
                    objectTextFieldAlignment: $objectTextFieldAlignment)
                .padding(.bottom)
                .padding(.top)
            }
            }
        .padding()
        }
    }
    var back: some View {
            Button(action: {
                ObjectTypes = 0
            }, label: {
                Image(systemName: "arrow.clockwise")
                    .foregroundColor(.black)
                    .frame(width: 30)
                    .scaledToFit()
                    .padding()
            })
    }
}

