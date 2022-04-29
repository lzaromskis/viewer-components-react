/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import type { IModelConnection } from "@itwin/core-frontend";
import { Presentation } from "@itwin/presentation-frontend";
import { useActiveIModelConnection } from "@itwin/appui-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { fetchIdsFromQuery, WidgetHeader } from "./utils";
import {
  clearEmphasizedElements,
  manufactureKeys,
  visualizeElements,
  visualizeElementsByKeys,
  zoomToElements,
} from "./viewerUtils";
import type { Group } from "./Grouping";
import "./PropertyMenu.scss";
import GroupPropertyAction from "./GroupPropertyAction";
import CalculatedPropertyAction from "./CalculatedPropertyAction";
import type { GroupProperty } from "./GroupPropertyTable";
import GroupPropertyTable from "./GroupPropertyTable";
import type {
  CalculatedProperty,
} from "./CalculatedPropertyTable";
import CalculatedPropertyTable from "./CalculatedPropertyTable";
import {
  IconButton,
  InformationPanel,
  InformationPanelBody,
  InformationPanelHeader,
  InformationPanelWrapper,
  LabeledTextarea,
  ProgressRadial,
  Text,
  toaster,
} from "@itwin/itwinui-react";
import type { CellProps } from "react-table";
import type {
  CustomCalculation,
} from "./CustomCalculationTable";
import CustomCalculationTable from "./CustomCalculationTable";
import CustomCalculationAction from "./CustomCalculationAction";
import { KeySet } from "@itwin/presentation-common";
import { SvgProperties } from "@itwin/itwinui-icons-react";
import type { PossibleDataType, PropertyMap } from "../../formula/Types";
import { useCombinedFetchRefresh } from "../hooks/useFetchData";
import { reportingClientApi } from "../../api/reportingClient";

interface PropertyModifyProps {
  iModelId: string;
  mappingId: string;
  group: Group;
  goBack: () => Promise<void>;
  hideGroupProps?: boolean;
  hideCalculatedProps?: boolean;
  hideCustomCalculationProps?: boolean;
}

export enum PropertyMenuView {
  DEFAULT = "default",
  ADD_GROUP_PROPERTY = "add_group_property",
  MODIFY_GROUP_PROPERTY = "modify_group_property",
  ADD_CALCULATED_PROPERTY = "add_calculated_property",
  MODIFY_CALCULATED_PROPERTY = "modify_calculated_property",
  ADD_CUSTOM_CALCULATION = "add_custom_calculation",
  MODIFY_CUSTOM_CALCULATION = "modify_custom_calculation",
}

const stringToPossibleDataType = (str?: string): PossibleDataType => {
  if (!str)
    return "undefined";

  switch (str.toLowerCase()) {
    case "double":
    case "number": return "number";
    case "string": return "string";
    case "boolean": return "boolean";
    default: return "undefined";
  }
};

const convertToPropertyMap = (groupProperties: GroupProperty[], calculatedProperties: CalculatedProperty[]): PropertyMap => {
  const map: PropertyMap = {};

  groupProperties.forEach((p) => {
    if (p.propertyName)
      map[p.propertyName] = stringToPossibleDataType(p.dataType);
  });

  calculatedProperties.forEach((p) => {
    if (p.propertyName)
      map[p.propertyName] = "number";
  });

  return map;
};

export const PropertyMenu = ({
  iModelId,
  mappingId,
  group,
  goBack,
  hideGroupProps = false,
  hideCalculatedProps = false,
  hideCustomCalculationProps = false,
}: PropertyModifyProps) => {
  const groupId = group.id ?? "";

  const iModelConnection = useActiveIModelConnection() as IModelConnection;
  const [propertyMenuView, setPropertyMenuView] = useState<PropertyMenuView>(
    PropertyMenuView.DEFAULT,
  );
  const [selectedGroupProperty, setSelectedGroupProperty] = useState<
  GroupProperty | undefined
  >(undefined);
  const [selectedCalculatedProperty, setSelectedCalculatedProperty] = useState<
  CalculatedProperty | undefined
  >(undefined);
  const [selectedCustomCalculation, setSelectedCustomCalculation] = useState<
  CustomCalculation | undefined
  >(undefined);
  const [isInformationPanelOpen, setIsInformationPanelOpen] =
    useState<boolean>(false);
  const [resolvedHiliteIds, setResolvedHiliteIds] = useState<string[]>([]);
  const [keySet, setKeySet] = useState<KeySet>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchGroupProperties = useMemo(
    () => async () => (await reportingClientApi.getGroupProperties(iModelId, mappingId, groupId)).properties,
    [iModelId, mappingId, groupId],
  );
  const { isLoading: isLoadingGroupProperties, data: groupProperties, refreshData: refreshGroupProperties } =
    useCombinedFetchRefresh<GroupProperty>(fetchGroupProperties);

  const fetchCalculatedProperties = useMemo(
    () => async () => (await reportingClientApi.getCalculatedProperties(iModelId, mappingId, groupId)).properties,
    [iModelId, mappingId, groupId],
  );
  const { isLoading: isLoadingCalculatedProperties, data: calculatedProperties, refreshData: refreshCalculatedProperties } =
    useCombinedFetchRefresh<CalculatedProperty>(fetchCalculatedProperties);

  const fetchCustomCalculations = useMemo(
    () => async () => (await reportingClientApi.getCustomCalculations(iModelId, mappingId, groupId)).customCalculations,
    [iModelId, mappingId, groupId],
  );
  const { isLoading: isLoadingCustomCalculations, data: customCalculations, refreshData: refreshCustomCalculations } =
    useCombinedFetchRefresh<CustomCalculation>(fetchCustomCalculations);

  const properties = useMemo(() => convertToPropertyMap(groupProperties, calculatedProperties), [groupProperties, calculatedProperties]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const ids = await fetchIdsFromQuery(group.query ?? "", iModelConnection);
        if (ids.length === 0) {
          toaster.warning("The query is valid but produced no results.");
          await goBack();
        }
        const keys = await manufactureKeys(ids, iModelConnection);
        setKeySet(keys);
        Presentation.selection.clearSelection(
          "GroupingMappingWidget",
          iModelConnection,
        );
        clearEmphasizedElements();
        const resolvedIds = await visualizeElementsByKeys(keys, "red");
        await zoomToElements(resolvedIds);
        setResolvedHiliteIds(resolvedIds);
        setIsLoading(false);
      } catch {
        toaster.negative(`Could not load ${group.groupName}.`);
        await goBack();
      }
    };
    void initialize();
  }, [iModelConnection, group.query, goBack, group.groupName]);

  const onGroupPropertyModify = useCallback(
    (value: CellProps<GroupProperty>) => {
      setSelectedGroupProperty(value.row.original);
      setPropertyMenuView(PropertyMenuView.MODIFY_GROUP_PROPERTY);
    },
    [],
  );

  const onCalculatedPropertyModify = useCallback(
    (value: CellProps<CalculatedProperty>) => {
      setSelectedCalculatedProperty(value.row.original);
      setPropertyMenuView(PropertyMenuView.MODIFY_CALCULATED_PROPERTY);
    },
    [],
  );

  const onCustomCalculationModify = useCallback(
    (value: CellProps<CustomCalculation>) => {
      setSelectedCustomCalculation(value.row.original);
      setPropertyMenuView(PropertyMenuView.MODIFY_CUSTOM_CALCULATION);
    },
    [],
  );

  const groupPropertyReturn = useCallback(async (modified: boolean) => {
    setPropertyMenuView(PropertyMenuView.DEFAULT);
    modified && refreshGroupProperties();
  }, [refreshGroupProperties]);

  const calculatedPropertyReturn = useCallback(async (modified: boolean) => {
    visualizeElements(resolvedHiliteIds, "red");
    await zoomToElements(resolvedHiliteIds);
    setPropertyMenuView(PropertyMenuView.DEFAULT);
    modified && refreshCalculatedProperties();
  }, [resolvedHiliteIds, refreshCalculatedProperties]);

  const customCalculationReturn = useCallback(async (modified: boolean) => {
    setPropertyMenuView(PropertyMenuView.DEFAULT);
    modified && refreshCustomCalculations();
  }, [refreshCustomCalculations]);

  if (isLoading) {
    return (
      <div className='loading-overlay'>
        <Text>Loading Group</Text>
        <ProgressRadial indeterminate />
        <Text>Please wait...</Text>
      </div>
    );
  }

  switch (propertyMenuView) {
    case PropertyMenuView.ADD_GROUP_PROPERTY:
      return (
        <GroupPropertyAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          keySet={keySet ?? new KeySet()}
          returnFn={groupPropertyReturn}
        />
      );
    case PropertyMenuView.MODIFY_GROUP_PROPERTY:
      return (
        <GroupPropertyAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          keySet={keySet ?? new KeySet()}
          groupPropertyId={selectedGroupProperty?.id ?? ""}
          groupPropertyName={selectedGroupProperty?.propertyName ?? ""}
          returnFn={groupPropertyReturn}
        />
      );
    case PropertyMenuView.ADD_CALCULATED_PROPERTY:
      return (
        <CalculatedPropertyAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          ids={resolvedHiliteIds}
          returnFn={calculatedPropertyReturn}
        />
      );
    case PropertyMenuView.MODIFY_CALCULATED_PROPERTY:
      return (
        <CalculatedPropertyAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          property={selectedCalculatedProperty}
          ids={resolvedHiliteIds}
          returnFn={calculatedPropertyReturn}
        />
      );
    case PropertyMenuView.ADD_CUSTOM_CALCULATION:
      return (
        <CustomCalculationAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          properties={properties}
          returnFn={customCalculationReturn}
        />
      );
    case PropertyMenuView.MODIFY_CUSTOM_CALCULATION:
      return (
        <CustomCalculationAction
          iModelId={iModelId}
          mappingId={mappingId}
          groupId={group.id ?? ""}
          properties={properties}
          customCalculation={selectedCustomCalculation}
          returnFn={customCalculationReturn}
        />
      );
    default:
      return (
        <InformationPanelWrapper className='property-menu-wrapper'>
          <div className='property-header'>
            <WidgetHeader
              title={`${group.groupName ?? ""}`}
              returnFn={goBack}
            />
            <IconButton
              styleType='borderless'
              onClick={() => setIsInformationPanelOpen(true)}
            >
              <SvgProperties />
            </IconButton>
          </div>
          <div className='property-menu-container'>
            {!hideGroupProps && (
              <div className='property-table'>
                <GroupPropertyTable
                  iModelId={iModelId}
                  mappingId={mappingId}
                  groupId={group.id ?? ""}
                  onGroupPropertyModify={onGroupPropertyModify}
                  setSelectedGroupProperty={setSelectedGroupProperty}
                  setGroupModifyView={setPropertyMenuView}
                  isLoadingGroupProperties={isLoadingGroupProperties}
                  groupProperties={groupProperties}
                  refreshGroupProperties={refreshGroupProperties}
                  selectedGroupProperty={selectedGroupProperty}
                />
              </div>
            )}

            {!hideCalculatedProps && (
              <div className='property-table'>
                <CalculatedPropertyTable
                  iModelId={iModelId}
                  mappingId={mappingId}
                  groupId={group.id ?? ""}
                  onCalculatedPropertyModify={onCalculatedPropertyModify}
                  setSelectedCalculatedProperty={setSelectedCalculatedProperty}
                  setGroupModifyView={setPropertyMenuView}
                  isLoadingCalculatedProperties={isLoadingCalculatedProperties}
                  calculatedProperties={calculatedProperties}
                  refreshCalculatedProperties={refreshCalculatedProperties}
                  selectedCalculatedProperty={selectedCalculatedProperty}
                />
              </div>
            )}
            {!hideCustomCalculationProps && (
              <div className='property-table'>
                <CustomCalculationTable
                  iModelId={iModelId}
                  mappingId={mappingId}
                  groupId={group.id ?? ""}
                  onCustomCalculationModify={onCustomCalculationModify}
                  setSelectedCustomCalculation={setSelectedCustomCalculation}
                  setGroupModifyView={setPropertyMenuView}
                  isLoadingCustomCalculations={isLoadingCustomCalculations}
                  customCalculations={customCalculations}
                  refreshCustomCalculations={refreshCustomCalculations}
                  selectedCustomCalculation={selectedCustomCalculation}
                />
              </div>
            )}
          </div>
          <InformationPanel
            className='information-panel'
            isOpen={isInformationPanelOpen}
          >
            <InformationPanelHeader
              onClose={() => setIsInformationPanelOpen(false)}
            >
              <Text variant='subheading'>{`${group.groupName ?? ""
              } Information`}</Text>
            </InformationPanelHeader>
            <InformationPanelBody>
              <div className='information-body'>
                <LabeledTextarea
                  label='Query'
                  rows={15}
                  readOnly
                  defaultValue={group.query ?? ""}
                />
              </div>
            </InformationPanelBody>
          </InformationPanel>
        </InformationPanelWrapper>
      );
  }
};
