/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { PropertyRecord, PropertyValueFormat } from "@itwin/appui-abstract";
import { CommonPropertyRenderer } from "@itwin/components-react/lib/cjs/components-react/properties/renderers/CommonPropertyRenderer";
import { NonPrimitivePropertyLabelRenderer } from "@itwin/components-react";

import { PropertyRenderer } from "./PropertyRender";
import { PropertyView } from "./PropertyView";
import type { PrimitiveRendererProps } from "./PrimitivePropertyRenderer";
import "./NonPrimitivePropertyRenderer.scss";

/** Properties of [[NonPrimitivePropertyRenderer]] React component
 * @public
 */
export interface NonPrimitivePropertyRendererProps
  extends PrimitiveRendererProps {
  /** Can struct/array property be collapsed */
  isCollapsible?: boolean;
}

/** State of [[NonPrimitivePropertyRenderer]] React component
 * @internal
 */
interface NonPrimitivePropertyRendererState {
  /** Is struct/array property expanded */
  isExpanded?: boolean;
}

/** React Component that renders struct and array properties
 * @public
 */
export class NonPrimitivePropertyRenderer extends React.Component<
NonPrimitivePropertyRendererProps,
NonPrimitivePropertyRendererState
> {
  /** @internal */
  public override readonly state: NonPrimitivePropertyRendererState = {
    /** If it's not collapsible, that means it's expanded by default and can't be collapsed */
    isExpanded:
      !this.props.isCollapsible || this.props.propertyRecord.autoExpand,
  };

  private _onExpanded = () => {
    this.setState({ isExpanded: true });
  };

  private _onCollapsed = () => {
    this.setState({ isExpanded: false });
  };

  private getLabel(
    props: NonPrimitivePropertyRendererProps,
    state: NonPrimitivePropertyRendererState,
  ): React.ReactNode {
    const { orientation, indentation, width, columnRatio, columnInfo } = props;
    const offset = CommonPropertyRenderer.getLabelOffset(
      indentation,
      orientation,
      width,
      columnRatio,
      columnInfo?.minLabelWidth,
    );

    let displayLabel = props.propertyRecord.property.displayLabel;
    if (
      this.props.propertyRecord.value.valueFormat === PropertyValueFormat.Array
    ) {
      displayLabel = `${displayLabel} (${this.props.propertyRecord.value.items.length})`;
    }

    return (
      <NonPrimitivePropertyLabelRenderer
        isExpanded={!!state.isExpanded}
        onExpand={this._onExpanded}
        onCollapse={this._onCollapsed}
        offset={offset}
        renderColon={false}
      >
        {displayLabel}
      </NonPrimitivePropertyLabelRenderer>
    );
  }

  private overrideArrayChildrenNames(items: PropertyRecord[]) {
    const modifiedProperties: PropertyRecord[] = items.map(
      (item, index): PropertyRecord => {
        const newProperty = { ...item.property };
        newProperty.displayLabel = `[${index + 1}]`;
        newProperty.name = `${newProperty.name}_${index}`;
        return new PropertyRecord(item.value, newProperty);
      },
    );

    return modifiedProperties;
  }

  private _renderPropertyForItem = (item: PropertyRecord) => {
    const prefix = this.props.uniqueKey
      ? this.props.uniqueKey
      : this.props.propertyRecord.property.name;
    const uniqueKey = `${prefix}_${item.property.name}`;
    return (
      <PropertyRenderer
        key={uniqueKey}
        uniqueKey={uniqueKey}
        propertyRecord={item}
        indentation={this.props.indentation ? this.props.indentation + 1 : 1}
        orientation={this.props.orientation}
        columnRatio={this.props.columnRatio}
        actionButtonRenderers={this.props.actionButtonRenderers}
        onColumnRatioChanged={this.props.onColumnRatioChanged}
        width={this.props.width}
        isResizeHandleHovered={this.props.isResizeHandleHovered}
        onResizeHandleHoverChanged={this.props.onResizeHandleHoverChanged}
        isResizeHandleBeingDragged={this.props.isResizeHandleBeingDragged}
        onResizeHandleDragChanged={this.props.onResizeHandleDragChanged}
        columnInfo={this.props.columnInfo}
      />
    );
  };

  /** @internal */
  public override render() {
    let items: PropertyRecord[] =
      this.props.propertyRecord.getChildrenRecords();
    if (
      this.props.propertyRecord.value.valueFormat === PropertyValueFormat.Array
    ) {
      items = this.overrideArrayChildrenNames(items);
    }

    const { ...props } = this.props;
    return (
      <>
        {this.props.isCollapsible ? (
          <PropertyView
            labelElement={this.getLabel(this.props, this.state)}
            {...props}
          />
        ) : undefined}

        {this.state.isExpanded
          ? items.map(this._renderPropertyForItem)
          : undefined}
      </>
    );
  }
}
